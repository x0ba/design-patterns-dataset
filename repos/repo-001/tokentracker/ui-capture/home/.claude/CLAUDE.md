# Global preferences

- I write Go on the backend and TypeScript/React on the frontend. Prefer the standard library.
- Run the narrowest test first (`go test ./internal/ledger/... -run TestX`), then the package.
- Never commit or push unless I ask. Conventional commit messages.
- Keep diffs small; don't reformat files you didn't otherwise touch.
- For SQL migrations: always write the down migration, and never drop columns in the same release.
- When unsure about product behavior, ask instead of guessing.
