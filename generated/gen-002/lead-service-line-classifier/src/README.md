# Tapcard Assist · review front end

Client-side review app for the Northgate pressure zone lead service line batch. It shows the assistant's proposed material class for the utility side and customer side of each unknown service line, with its reasoning, cited records, and rule flags. The reviewer accepts, overrides, sends to field dig, or holds each line.

There is no backend. All data is mock data generated once by a seeded script. Reviewer decisions are kept in the browser's localStorage.

## Commands

```sh
npm install
npm run dev          # local dev server
npm run build        # type-check, then write the static site to ./out
npm run generate:batch   # regenerate src/data/northgate-batch.json (seeded, deterministic)
```

`./out/index.html` is the entry point. Asset URLs are relative, and routing uses the URL hash (`#/proposals`, `#/groups`, and so on), so the build works from the root of any plain static file server with no rewrites.

## Where things live

- `scripts/generate-batch.mjs` builds the 600-line batch. Its counts match the working snapshot: 410 proposed (188 high, 141 medium, 81 low), 190 queued, 37 GRR, 12 conflicts with a 2024 field verification.
- `src/data/northgate-batch.json` is the generated batch and the seeded decisions (58 accepted, made before this session).
- `src/lib/model.ts` holds the rule references (`RULES`) and the flag checks (`flagsFor`). The flag checks are the only place the app decides that something needs attention. The reviewer makes every decision.
- `src/data/instructions.ts` holds the applied corrections (C1 to C3) and the draft correction D1 under review.
- `src/data/citywide.ts` holds the citywide inventory totals and the activity log.
- `src/lib/csv.ts` builds the working file and the field-dig list.

## Before this is used for real

- The state rule text and its section numbers (§3.2, §3.4, §4.1 to §4.5, §5) are the working copy's references. Check them against the state's current guidance.
- The working CSV is not the state's submission template. Confirm the layout against the state's template before upload.
- Every record, name, permit number, and tap card number in the data is fabricated.
