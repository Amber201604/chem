# /// script
# dependencies = [
#   "trl>=0.12.0",
#   "peft>=0.7.0",
#   "transformers>=4.46.0",
#   "datasets>=3.0.0",
#   "accelerate>=1.0.0",
#   "trackio",
# ]
# ///
"""
SFT + LoRA Training Script for Canadian High School (SCH3U/SCH4U) & AP Chemistry Scaffolding Tutor.

Compatible with:
1. Local GPU execution:
   uv run scripts/train_trl_sft.py --local_jsonl data/sft/chem_scaffolding_sft.jsonl
2. Hugging Face Jobs cloud execution:
   hf jobs uv run --flavor a10g-large --timeout 2h --secrets HF_TOKEN scripts/train_trl_sft.py
"""

import argparse
from pathlib import Path
from datasets import Dataset, concatenate_datasets, load_dataset
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer


SYSTEM_PROMPT = (
    "You are a guarded Canadian High School (Ontario SCH3U/SCH4U) and AP Chemistry Scaffolding Tutor. "
    "Your goal is to help students build independent reasoning across observable changes, particle-level interactions, "
    "and symbolic chemical equations. Never dump the final answer directly on early turns. "
    "Follow the diagnostic sequence: Predict -> Explain -> Inspect -> Diagnose -> Hint -> Revise -> Independent Check. "
    "Ask one guiding question or conceptual cue at a time."
)


def parse_args():
    parser = argparse.ArgumentParser(description="Train AP/SCH4U Chemistry Scaffolding Tutor with TRL SFTTrainer")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-3B-Instruct")
    parser.add_argument("--local_jsonl", type=str, default="data/sft/chem_scaffolding_sft.jsonl")
    parser.add_argument("--output_dir", type=str, default="outputs/qwen-chem-scaffolding-tutor")
    parser.add_argument("--hub_model_id", type=str, default="")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--max_length", type=int, default=1024)
    return parser.parse_args()


def load_combined_dataset(local_jsonl: str) -> Dataset:
    local_path = Path(local_jsonl)
    if local_path.exists():
        ds_local = load_dataset("json", data_files=str(local_path), split="train")
        ds_local = ds_local.map(lambda ex: {"messages": ex["trl_messages"]}, remove_columns=ds_local.column_names)
        return ds_local

    # Fallback if running on cloud without local JSONL: pull directly from Hugging Face Hub
    ds_socratic = load_dataset("Susu11/socraticfinetune", split="train")
    ds_chem = load_dataset("kd13/ChemistryConcepts-Instruct-v1", split="train[:1000]")

    def convert_chem(ex):
        return {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": ex["user"]},
                {
                    "role": "assistant",
                    "content": (
                        f"Let's scaffold **{ex['topic']}** step by step instead of jumping straight to the answer. "
                        f"First, what particles or charges are interacting here, and what do you predict happens first?"
                    ),
                },
            ]
        }

    ds_chem_mapped = ds_chem.map(convert_chem, remove_columns=ds_chem.column_names)
    ds_socratic_mapped = ds_socratic.select_columns(["messages"])
    return concatenate_datasets([ds_socratic_mapped, ds_chem_mapped])


def main():
    args = parse_args()
    dataset = load_combined_dataset(args.local_jsonl)
    split = dataset.train_test_split(test_size=0.1, seed=42)

    push_to_hub = bool(args.hub_model_id)
    trainer = SFTTrainer(
        model=args.base_model,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        peft_config=LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            task_type="CAUSAL_LM",
        ),
        args=SFTConfig(
            output_dir=args.output_dir,
            max_length=args.max_length,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=8,
            learning_rate=2e-4,
            lr_scheduler_type="cosine",
            warmup_ratio=0.05,
            logging_steps=10,
            eval_strategy="steps",
            eval_steps=25,
            save_strategy="steps",
            save_steps=50,
            push_to_hub=push_to_hub,
            hub_model_id=args.hub_model_id if push_to_hub else None,
            report_to="none",
        ),
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    if push_to_hub:
        trainer.push_to_hub()


if __name__ == "__main__":
    main()
