import json
import math
from pathlib import Path
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parent.parent
SFT_DIR = ROOT / "data" / "sft"
SFT_JSONL = SFT_DIR / "chem_scaffolding_sft.jsonl"
MODEL_OUT = SFT_DIR / "trained_scaffold_model.json"
WEIGHTS_OUT = SFT_DIR / "trained_scaffold_classifier.pt"

BARRIER_LABELS = [
    "conceptual-misunderstanding",
    "representation-gap",
    "missing-prerequisite",
    "unsystematic-problem-solving",
    "ambiguous-language",
    "insufficient-evidence",
]


def load_sft_records():
    records = []
    with SFT_JSONL.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training Scaffolding Tutor neural router & diagnostic classifier on: {device}" + (f" ({torch.cuda.get_device_name(0)})" if device.type == "cuda" else ""))

    records = load_sft_records()
    print(f"Loaded {len(records)} SFT multi-turn scaffolding dialogues.")

    # Build turn-level training samples:
    # Each sample pairs student query + topic + curriculum context -> (dialogue_index, barrier_index)
    texts = []
    dialogue_targets = []
    barrier_targets = []

    for d_idx, rec in enumerate(records):
        topic = rec.get("topic", "")
        curriculum = rec.get("curriculum", "")
        evidence = rec.get("evidence", "")
        barrier = rec.get("barrier", "insufficient-evidence")
        b_idx = BARRIER_LABELS.index(barrier) if barrier in BARRIER_LABELS else 5

        user_msgs = [m["content"] for m in rec.get("messages", []) if m.get("role") == "user"]
        combined_doc = f"{topic} | {curriculum} | {evidence} | " + " ".join(user_msgs)
        texts.append(combined_doc)
        dialogue_targets.append(d_idx)
        barrier_targets.append(b_idx)

        # Also add individual user turn variations for robust retrieval
        for u_msg in user_msgs:
            texts.append(f"{topic} {u_msg}")
            dialogue_targets.append(d_idx)
            barrier_targets.append(b_idx)

    vectorizer = TfidfVectorizer(
        max_features=1024,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True,
    )
    X_np = vectorizer.fit_transform(texts).toarray()
    X_t = torch.tensor(X_np, dtype=torch.float32, device=device)
    y_diag = torch.tensor(dialogue_targets, dtype=torch.long, device=device)
    y_barr = torch.tensor(barrier_targets, dtype=torch.long, device=device)

    in_dim = X_np.shape[1]
    hid_dim = 128
    num_dialogues = len(records)
    num_barriers = len(BARRIER_LABELS)

    class DualHeadScaffoldNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.encoder = nn.Sequential(
                nn.Linear(in_dim, hid_dim),
                nn.ReLU(),
                nn.Dropout(0.1),
            )
            self.dialogue_head = nn.Linear(hid_dim, num_dialogues)
            self.barrier_head = nn.Linear(hid_dim, num_barriers)

        def forward(self, x):
            h = F.normalize(self.encoder(x), p=2, dim=-1)
            return self.dialogue_head(h), self.barrier_head(h), h

    torch.manual_seed(42)
    model = DualHeadScaffoldNet().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-2, weight_decay=1e-4)

    epochs = 120
    loss_history = []
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits_d, logits_b, _ = model(X_t)
        loss_d = F.cross_entropy(logits_d, y_diag)
        loss_b = F.cross_entropy(logits_b, y_barr)
        loss = loss_d + 0.5 * loss_b
        loss.backward()
        optimizer.step()
        if epoch in (1, 20, 40, 60, 80, 100, 120):
            with torch.no_grad():
                acc_d = (logits_d.argmax(dim=-1) == y_diag).float().mean().item()
                acc_b = (logits_b.argmax(dim=-1) == y_barr).float().mean().item()
            loss_history.append({
                "epoch": epoch,
                "loss": round(loss.item(), 4),
                "dialogue_acc": round(acc_d, 4),
                "barrier_acc": round(acc_b, 4),
            })
            print(f"Epoch {epoch:3d}/{epochs} | loss={loss.item():.4f} | dialogue_acc={acc_d*100:.1f}% | barrier_acc={acc_b*100:.1f}%")

    # Save PyTorch checkpoint
    torch.save(model.state_dict(), WEIGHTS_OUT)

    # Export compact JSON artifact for TypeScript server inference (TF-IDF vocabulary + IDF + dialogue vectors + exemplars)
    model.eval()
    with torch.no_grad():
        doc_texts = [
            f"{r.get('topic', '')} | {r.get('curriculum', '')} | {r.get('evidence', '')} | "
            + " ".join(m["content"] for m in r.get("messages", []) if m.get("role") == "user")
            for r in records
        ]
        X_docs = torch.tensor(vectorizer.transform(doc_texts).toarray(), dtype=torch.float32, device=device)
        _, logits_b_docs, doc_embeddings = model(X_docs)
        pred_barriers = logits_b_docs.argmax(dim=-1).cpu().tolist()
        doc_emb_list = [[round(float(v), 5) for v in row] for row in doc_embeddings.cpu().numpy()]

    vocab = {term: int(idx) for term, idx in vectorizer.vocabulary_.items()}
    idf = [round(float(v), 5) for v in vectorizer.idf_]

    # Export linear encoder weights so TypeScript can compute the exact same neural embedding in <1ms
    w_enc = model.encoder[0].weight.detach().cpu().numpy()
    b_enc = model.encoder[0].bias.detach().cpu().numpy()
    w_barr = model.barrier_head.weight.detach().cpu().numpy()
    b_barr = model.barrier_head.bias.detach().cpu().numpy()

    exported_dialogues = []
    for idx, rec in enumerate(records):
        assistant_turns = [m["content"] for m in rec.get("messages", []) if m.get("role") == "assistant"]
        user_turns = [m["content"] for m in rec.get("messages", []) if m.get("role") == "user"]
        # Ensure 4 support levels (0, 1, 2, 3)
        ladder = [
            assistant_turns[0] if len(assistant_turns) > 0 else "What particles or charges are interacting here, and what do you predict happens first?",
            assistant_turns[1] if len(assistant_turns) > 1 else (assistant_turns[0] if assistant_turns else "Focus on how the particles move and how charge is conserved."),
            assistant_turns[2] if len(assistant_turns) > 2 else (assistant_turns[-1] if assistant_turns else "Connect the particle interaction to the balanced chemical equation."),
            assistant_turns[3] if len(assistant_turns) > 3 else (
                assistant_turns[-1] if len(assistant_turns) > 2 else "Now test your understanding on a related example without hints: state the observation, particle story, and equation."
            ),
        ]
        exported_dialogues.append({
            "id": rec["id"],
            "source": rec["source"],
            "curriculum": rec["curriculum"],
            "topic": rec["topic"],
            "questionKey": rec.get("questionKey", "uncategorized"),
            "barrier": rec.get("barrier", BARRIER_LABELS[pred_barriers[idx]]),
            "barrierConfidence": rec.get("barrierConfidence", "medium"),
            "evidence": rec.get("evidence", user_turns[0] if user_turns else ""),
            "whatChanged": rec.get("whatChanged", ""),
            "remainingDifficulty": rec.get("remainingDifficulty", ""),
            "nextActivity": rec.get("nextActivity", ""),
            "sampleQuestion": user_turns[0] if user_turns else rec["topic"],
            "supportLadder": ladder,
            "messages": rec.get("messages", []),
            "embedding": doc_emb_list[idx],
        })

    artifact = {
        "modelName": "sft-chem-scaffold-v1",
        "trainedOnDevice": f"{device.type.upper()} ({torch.cuda.get_device_name(0)})" if device.type == "cuda" else "CPU",
        "numDialogues": len(records),
        "vocabSize": len(vocab),
        "embeddingDim": hid_dim,
        "barrierLabels": BARRIER_LABELS,
        "trainingMetrics": loss_history,
        "vocab": vocab,
        "idf": idf,
        "encoderWeight": [[round(float(x), 5) for x in row] for row in w_enc],
        "encoderBias": [round(float(x), 5) for x in b_enc],
        "barrierWeight": [[round(float(x), 5) for x in row] for row in w_barr],
        "barrierBias": [round(float(x), 5) for x in b_barr],
        "dialogues": exported_dialogues,
    }

    MODEL_OUT.write_text(json.dumps(artifact, ensure_ascii=False), encoding="utf-8")
    print(f"Exported trained model artifact to {MODEL_OUT} ({MODEL_OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
