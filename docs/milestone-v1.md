# Milestone v1 — Finalized Review Comparison

The original review desk displayed detailed findings from the latest review and verdict summaries for older revisions. Maintainers can now compare any two finalized reviews loaded for the same locked issue, including reviews of different patch candidates and rechecks of one candidate.

## Try it

1. Open the Review Desk and select pilot patch 1 for issue 1.
2. Expand **Compare finalized reviews**. Choose patch 2, review 1 as **Before** and patch 1, review 1 as **After** to compare the FAILED and FIXED verdicts.
3. Inspect the criterion status, reasoning, quotations and evidence identity on both sides. A finding can change even when its status stays the same.
4. Choose patch 3 to compare its initial review and recheck against the same submitted evidence.

The comparison reads the same finalized records as the existing desk, which loads the latest 40 candidates. It checks both review hash chains locally before displaying a comparison. The existing Studionet deployment at `0x50D68c089F7c55468d6DF00572F432ebF72749F2` supplies all records, with no wallet connection or transaction required.

[Existing contract explorer](https://explorer-studio.genlayer.com/address/0x50D68c089F7c55468d6DF00572F432ebF72749F2)

Run `npm ci && npm test && npm run build` from `web/`.
