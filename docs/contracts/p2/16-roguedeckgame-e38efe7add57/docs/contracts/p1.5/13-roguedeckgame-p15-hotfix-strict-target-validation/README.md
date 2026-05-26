# Phase 1.5 Hotfix Patch Package

This ZIP contains an independent validation report, a Codex contract, and a ready-to-apply patch for `roguedeckgame-review-c41b1c0ebcf2.zip`.

Files:

```txt
codex-contract-p15-hotfix-strict-target-validation.md
validation-report.md
phase-1.5-hotfix.patch
changed-files/
```

Apply from the repo root:

```bash
patch -p1 < phase-1.5-hotfix.patch
```

Then run the commands listed in the contract/report.
