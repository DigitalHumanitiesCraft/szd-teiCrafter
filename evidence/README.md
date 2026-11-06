# Evidence

Frozen results of the agent annotation runs of 2026-10-31 and of the review of the calibration letter `o_szd.1222`. Until 2026-11-06 they lay in the trial run folder `szd-teiCrafter-probelauf` beside this repository, with the same inner structure, so the relative paths in their READMEs and protocols still hold.

- `annotation/` holds one folder per way of annotating (`direkt-a`, `direkt-b`, `browser`, `hybrid`) with annotated copies, proposal files, decision tables, logs and protocols, plus the shared check `pruefe.mjs`. Its maintained successor is `tools/check-annotated-copy.mjs`.
- `review/o_szd.1222/` holds the review packet, the two agent checks, the reconciled proposal file, the review log and the reviewed letter. Its `README.md` describes the files and the reach of the review.

Each folder carries a `MANIFEST.sha256`. Check it with `sha256sum -c MANIFEST.sha256` inside the folder. The files are not edited; a correction goes into a new dated folder.

The screenshots (`*.png`) stay out of Git, because they show facsimile images of Stefan Zweig Digital whose licence is not yet confirmed. They remain in the local clone on the operator's machine and are listed in the manifest, so a fresh clone reports them as missing and verifies every other file.
