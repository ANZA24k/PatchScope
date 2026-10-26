# PatchScope

**Lock the issue. Commit the patch. Verify the evidence with independent GenLayer consensus.**

Patch authors and maintainers can disagree about what “fixed” means after work has already begun. PatchScope records the acceptance standard first: a repository, baseline commit, fix criteria, regression guards, authorized submitter and deadline. A patch author commits exact public files with SHA-256 and byte lengths. GenLayer validators independently retrieve and interpret those files, then deterministic rules return **FIXED / PARTIAL / FAILED / INCONCLUSIVE**.

This is a complete evidence-review workflow, not an LLM chat wrapper. The contract enforces immutable terms, authorization, evidence integrity, bounded reviews and hash-linked history. The frontend genuinely calls the deployed contract, reads finalized state, prepares and sends confirmed writes, tracks consensus/finality and exports auditable receipts.

## Live deployment

**Public app:** https://patchscope.ansaf1st34.chatgpt.site

- Network: **Studionet**, chain **61999**, simulated test GEN only.
- Contract: [0x50D68c089F7c55468d6DF00572F432ebF72749F2](https://explorer-studio.genlayer.com/address/0x50D68c089F7c55468d6DF00572F432ebF72749F2)
- [Finalized deployment transaction](https://explorer-studio.genlayer.com/tx/0x86046bfb4238f219e8672c8e307db5933dc9e5854b240cb86b331d6ef9c779e1)
- Verified deployed contract SHA-256: `3798a31fc32a56b3552d662e10b9542ad5154e427a4da89ab3064b7b42f95cea`
- Contract and immutable pilot evidence source: [`cb72e31860e36f313bd161aff1d9decb773deca3`](https://github.com/ANZA24k/PatchScope/tree/cb72e31860e36f313bd161aff1d9decb773deca3)
- Synthetic unfixed baseline: [`fdf153c9b89eff1d9573f1c73ba42fb6d133a204`](https://github.com/ANZA24k/PatchScope/tree/fdf153c9b89eff1d9573f1c73ba42fb6d133a204)
- Current website configuration and pilot transaction index: [web/public/deployment.json](web/public/deployment.json).
- [Live verification evidence](docs/live-verification.md).

## Try it

1. Open the public website linked in the live verification record. The review desk reads finalized contract state without a wallet.
2. Select a patch. Inspect the locked issue, exact commit, criteria, source hashes, findings, quotations and review history. **Verify bytes** independently downloads the pinned file and checks its commitment. Export the receipt JSON for offline inspection.
3. For writes, connect an EIP-1193 wallet or create the optional browser test account. Wallet connection requests only the address. It never signs or submits a transaction. The browser test account generates a new session-only test key using Studio's SDK primitives; it is distinct from Studio's built-in account and never requests an existing private key.
4. Lock an issue with both fix and regression criteria. Authorize the patch author's address. Submit 1–4 files from a different exact commit than the baseline. The frontend calculates their SHA-256 hashes and lengths before showing the transaction preview.
5. Preview the method, arguments, signer, contract and network. Confirm only the intended write. External wallets require chain 61999 and their own confirmation; no Snaps, token approvals or unnecessary wallet permissions are requested. The browser test account uses simulated faucet funds only after a confirmed write.
6. Follow the transaction through pending/consensus, ACCEPTED and FINALIZED. Acceptance is not finality. Failures and undetermined outcomes are shown. If tracking times out or the page reloads, use **Resume tracking**, not a blind resubmission.
7. Any account can start a first review. Owner or submitter may recheck non-FIXED candidates with the expected prior review count. Up to three append-only reviews are permitted; FIXED is terminal. Changed evidence needs a new candidate.

## Run locally

Python 3.12+, Node 22+:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
ruff check contracts tests demo
GENVM_VERSION=v0.2.16 genvm-lint check contracts/patchscope.py
python -m pytest -q tests/direct demo/test_demo.py
cd web
npm ci
npm test
npm run build
npm run dev
```

Tests use the official `genlayer-test` Direct Mode fixtures, mocked web/LLM calls and actual captured validator re-execution. Mock tests do not replace the live full-consensus pilots. CI repeats lint, SDK validation, Python tests, frontend tests and production build. Dependencies, runner and runtime are pinned for reproducibility; see [official API compatibility notes](docs/official-api-notes.md).

## Architecture and safeguards

- `contracts/patchscope.py`: three writes (`lock_issue`, `submit_patch`, `review`) and three views (`counts`, `get_issue`, `get_candidate`).
- [Full trust/state model](docs/architecture.md): strict schemas, duplicate-key rejection, monotonic IDs, bounded timestamps, canonical hashes, exact-byte validation and independent consensus.
- Sources must be commit-pinned `raw.githubusercontent.com` files from the locked repository. Limits: 4 sources, 12,000 bytes per file, 24,000 total, 6 criteria, 8 candidates per issue, 3 reviews per candidate and 128 pilot issues.
- Validators repeat web retrieval and semantic judgment and compare every criterion status and source fingerprint. They also check the leader's exact quotations against their own source bytes. Schema-only validation is never sufficient.
- Any FAIL → FAILED; all PASS → FIXED; some PASS plus UNKNOWN → PARTIAL; all UNKNOWN → INCONCLUSIVE. A regression guard PASS means preserved behavior.
- Changed/malformed evidence produces a recorded INCONCLUSIVE. Temporary retrieval/execution failure leaves state unchanged for retry. The accepted leader findings are recorded; individual validator intermediate opinions are not separately stored.

## Limitations

PatchScope reviews **submitted evidence**, not all possible program executions. It does not run untrusted code, formally prove a fix, attest CI environments, establish repository ownership or guarantee security. A hash authenticates bytes, not their truth or origin. A submitter can omit relevant files or publish false test reports; lock appropriate requirements and inspect the source. The synthetic pilots make no claim of real production adoption.

Prompt injection defenses reduce risk; no prompt-based system offers absolute protection. Models can disagree or misclassify. GitHub and GenLayer availability affect execution. Evidence body limits are enforced after retrieval, because this SDK provides no streaming response cap. Public issue creation can exhaust pilot capacity. There is no escrow, token approval, payment or financial settlement.

A practical continuation is authenticated CI attestations tied to patch commits, per-project creation quotas, and broader real maintainer pilots. Existing immutable checklists, exact-byte receipts and independent findings already support auditable patch triage within the stated boundary.

MIT licensed. See [LICENSE](LICENSE).
