# Live verification — 2026-10-26

All contract writes use Studionet simulated test GEN and full consensus (`leaderOnly: false`). No production funds, token approvals, Snap or private-key imports were used.

**Public website:** https://patchscope.ansaf1st34.chatgpt.site

Published Site version 1 from website source commit `1d5d5325485442b1976061a87324b764bb9d2c92`; access is public. The final read-only capture confirms all ten indexed transactions FINALIZED with successful leader execution, issue count 2 and candidate count 3.

## Deployment and exact source

- [Contract](https://explorer-studio.genlayer.com/address/0x50D68c089F7c55468d6DF00572F432ebF72749F2)
- [Deployment](https://explorer-studio.genlayer.com/tx/0x86046bfb4238f219e8672c8e307db5933dc9e5854b240cb86b331d6ef9c779e1)
- Studio built-in maintainer: `0x99837323C36d147D42f04e728325F599309A5519`.
- Separate browser test-account submitter: `0xd81fe8E6579B232d50ba94c952FB37cf20eC3acA`.
- Deployed code retrieved through `getContractCode` matches `contracts/patchscope.py` byte-for-byte.
- SHA-256: `3798a31fc32a56b3552d662e10b9542ad5154e427a4da89ab3064b7b42f95cea`.
- Runtime pinned to Studio-supported v0.2.16. Contract was deployed once.

## Pilot scenarios

All three use the same locked issue, exact patch commit `cb72e31860e36f313bd161aff1d9decb773deca3`, and one independently retrieved code file. This keeps the judgment grounded in source behavior rather than trusting a prose report.

| Candidate | Fixture | Final verdict | Review transaction |
|---|---|---|---|
| 1 | Explicit zero-count guard, preserves normal division | FIXED | [Review](https://explorer-studio.genlayer.com/tx/0x3c3da12f39c4b770ec10cc4410423cc23b70e3f23acf7b5c6cf831b841f3a733) |
| 2 | Original division still executes for zero count | FAILED | [Review](https://explorer-studio.genlayer.com/tx/0xa50db904d9805743113c07d785ade9acb20a7ddb89a8b9b4fcbf4a68701a2795) |
| 3 | Delegation to unavailable external implementation | INCONCLUSIVE | [Frontend review](https://explorer-studio.genlayer.com/tx/0x9cd99510d7c77f83f52f81b12626aad4880c737e7414dc3b1f5afe59914a864f) |

[Authorized Studio-owner recheck](https://explorer-studio.genlayer.com/tx/0x844d9fcaa3374b49c6a329ae68ee23baeb3cb05cc548948a658e9d756b298dc3) appends a second review to candidate 3 without deleting its first result. The receipt chain is independently checked by the frontend and live verification script.

[Studio issue creation](https://explorer-studio.genlayer.com/tx/0xb0a25e09812150373f651da8322f7a4a78a9bd99ce44f08b106632622c1beb9c) authorizes a separate patch author.

The frontend itself completed all three contract write methods:

- [lock_issue](https://explorer-studio.genlayer.com/tx/0xccb496770e009ad74a1f1ac4ba6b84d44bd968dd7efbb65ca26e5c72eda5bd35)
- [submit_patch, candidate 1](https://explorer-studio.genlayer.com/tx/0x883558badac1ec310b9a890c02f55e632d388956a8b29eece3120edda424a61d)
- [submit_patch, candidate 2](https://explorer-studio.genlayer.com/tx/0x728d09c36d352fa5c9c484dab34c3023cacad8d4f5d7a5fc49a294d52c3231f5)
- [submit_patch, candidate 3](https://explorer-studio.genlayer.com/tx/0x71c1d7c5dea3bcd2d6d48efb70143fe8cbfa4a13535d4137647d1f33f6f96742)
- [review](https://explorer-studio.genlayer.com/tx/0x9cd99510d7c77f83f52f81b12626aad4880c737e7414dc3b1f5afe59914a864f)

The application tracked real transactions through acceptance to finality, resumed tracking after a refresh, read finalized findings, and verified the review hash chain. A discovered UI receipt bug was corrected: an idle-validator error marker must not classify a successful leader execution as failed. A regression test now covers that exact Studio shape.

## Reproduce verification

```sh
cd web
node verify-live.mjs
```

This read-only script checks deployed code equality, finalized state, every pinned evidence hash/length, review hash chains and the transaction receipt index. It writes `docs/live-state.json`, containing actual retrieved candidate records, source fingerprints and receipt summaries. It does not submit or repeat any review.

## Tests and limits

- 42 official Direct Mode contract tests plus 2 executable synthetic fixture tests: **44 Python tests**.
- 13 frontend tests: wallet public-address-only connection, rejection/no-provider behavior, pinned URL constraints, Python-compatible canonical hashing, SHA-256 known vector, receipt-chain tampering and transaction lifecycle semantics.
- Ruff, GenVM safety lint, pinned SDK semantic validation and production frontend build pass.
- Live MetaMask extension confirmation is **not verified**: the test browser has no EIP-1193 extension. Missing-wallet UI behavior was exercised; EIP-1193 interactions are covered with a controlled provider. The actual live writes used Studio's built-in account and a distinct browser-generated test signer.
- These are synthetic examples, not production security or adoption evidence. No claims of video/post publication are made.
