---
name: STARK paper summary
date: 2026-02-07
topics:
  - zk
  - summary
  - stark
  - iop
---

# STARK paper summary

[Scalable, transparent, and post-quantum secure computational integrity - Ben-Sasson, Bentov, Horesh, Riabzev (2018)](https://eprint.iacr.org/2018/046)

## Contribution

**STARK** (**S**calable **T**ransparent **A**rgument of **K**nowledge) is the first _realized_ transparent zero-knowledge proof system in which verification scales exponentially faster than data size, with no trusted setup and no trapdoors. The paper reports

> the first implementation achieving both transparency and exponential verification speedup for general computations.

## Motivation

- Zero-knowledge proofs can reconcile privacy with integrity (e.g. proving properties of sensitive data without revealing it). Public trust requires **transparency**: no trusted party and no trapdoors.
- For big data, verification must scale **sublinearly**. Prior transparent ZK constructions were impractical; no deployed system (including Zcash at the time) had both transparency and exponential verification speedup for general computation.

## Main results

1. **zkSTARK:** A transparent ZK argument system where verification is exponentially faster than database (or computation) size. The speedup is observed concretely for meaningful sequential computations.

2. **Building blocks:** The system uses recent [IOP](posts/zk/zk-terminology.md#interactive-oracle-proof-iop) machinery, including a **“fast” (linear-time) IOP** for error-correcting codes - i.e. **FRI** (Fast [Reed–Solomon IOPP](posts/zk/zk-terminology.md#reed-solomon-interactive-oracle-proof-of-proximity-rs-iopp)) - plus **Algebraic Linking (ALI)** and an algebraic intermediate representation for the computation.

3. **Proof-of-concept:** A DNA database application: the Police prove to the public that a candidate’s DNA profile is **not** in the forensic database, without revealing any DNA data. The proof is shorter than the database and verifies faster than a naive scan.

## Technical core

- **IOP-based:** The argument is built from an [Interactive Oracle Proof (IOP)](posts/zk/zk-terminology.md#interactive-oracle-proof-iop); the prover sends oracles (e.g. polynomial evaluations), the verifier queries them. Making it non-interactive uses a public random string (Fiat–Shamir style).
- **Transparency:** Only public randomness; no trusted setup or trapdoors.
- **Post-quantum:** Security relies on collision-resistant hashing (no known efficient quantum attack on the construction).
- **Complexity:** Prover $O(T \log T)$, verifier $O(\log T)$ for computation of length $T$ (in the improved formulation), with FRI ([RS-IOPP](posts/zk/zk-terminology.md#reed-solomon-interactive-oracle-proof-of-proximity-rs-iopp)) providing the low-degree test.

## Efficiency and impact

- First **code-to-deployment** transparent ZK system with exponential verification speedup.
- Foundation for StarkWare, RISC Zero, and other STARK-based systems; later improved by DEEP-FRI and DEEP-ALI for better soundness.

**Bottom line:** The STARK paper delivers the first practical transparent ZK system with verification exponentially faster than data size, using FRI and ALI, and demonstrates it with a privacy-preserving DNA database application.
