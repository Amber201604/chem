---
name: junior-chemistry-courseware
description: >-
  Builds and maintains junior-chemistry interactive courseware (valency, chemical
  formulas, ions, Bohr electron models, 3D transfer animations) with bilingual
  EN/ZH UI and a strict split between teaching models vs real-world facts. Use when
  working on valency-formula-lab, world-knowledge docs, ion/atom particle counts,
  electron shells, formula derivation, or junior chemistry teaching interactions.
---

# Junior Chemistry Courseware

## When this skill applies

- Editing `valency-formula-lab` chemistry UI / 3D / i18n
- Adding ions, atoms, samples, or electron-transfer behavior
- Writing or updating `world-knowledge/` facts
- Teaching content about valency, formulas, ions, protons/neutrons/electrons

## Hard rules

1. **Teaching model ≠ reality**  
   Bohr rings, same-direction orbits, and simplified Fe shells are OK in the app.  
   Real-world statements go in `world-knowledge/*.md` and must not contradict physics/chem facts.

2. **Particle counts must be complete**  
   Never cap or fake nucleon counts in 3D. Show all \(p^+\), \(n\), and live \(e^-\) totals.  
   Neutral atom: \(N(e^-)=N(p^+)=Z\). Ions change electrons only.

3. **Update knowledge when facts change**  
   If particle numbers, isotopes, or physical claims change, update both:
   - code (`src/data/atoms.ts` etc.)
   - `world-knowledge/` (and index in `world-knowledge/README.md`)

4. **Languages**  
   Default UI locale is **English**. Every new user-facing string needs `en` + `zh` + `fr` (`src/i18n/translations.ts` and locale modules).

5. **Polyatomic ions**  
   NH₄⁺, OH⁻, SO₄²⁻, NO₃⁻: no fake single-atom Bohr model. Explain as a group; offer Cl/O (or metal) demos instead.

## Formula engine (ionic compounds)

Cross valency → simplify by GCD → subscripts; polyatomic needs parentheses when count > 1.

\[
n_+ = |v_-|/\gcd(|v_+|,|v_-|),\quad
n_- = |v_+|/\gcd(|v_+|,|v_-|)
\]

Check: \(v_+ n_+ + v_- n_- = 0\).

## Electron transfer demos

| Side | Behavior | Examples |
|------|----------|----------|
| Metal / cation former | Outer \(e^-\) fly away | Na, Mg, Al, Ca, Fe |
| Nonmetal / anion former | \(e^-\) fly in | Cl, O |

Keep half-equations visible (EN/ZH).

## World-knowledge workflow

1. New durable fact? Add/update a file under `world-knowledge/`.
2. Link it from `world-knowledge/README.md`.
3. Prefer short, classroom-ready wording + one “misconception vs accurate” table when useful.

Known docs:

- [atoms-and-particles.md](../../world-knowledge/atoms-and-particles.md)
- [electron-rotation-symmetry.md](../../world-knowledge/electron-rotation-symmetry.md)
- [digestion-tomato.md](../../world-knowledge/digestion-tomato.md)

## Reference

- Particle table & ion rules: [reference-particles.md](reference-particles.md)
