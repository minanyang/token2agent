# AGENTS.md

Read CONTRIBUTING.md first. Chapter authoring rules: the header comment in templates/stage.md.
English edition rules: templates/translation-en.md.

## Verify before claiming done

```sh
pnpm build && pnpm check:sources && pnpm check:links   # same gate as CI
node --test scripts/*.test.mjs                         # analytics / search-console tests
```

## Rules not obvious from the code

- Traditional Chinese is the root locale and the source text. Any change under `src/content/docs/` must update the
  matching page under `src/content/docs/en/`, or say explicitly that the English page is pending.
- Don't run `pnpm deploy`. Cloudflare Workers Builds deploys on push to `main`.
- Keep heading anchors stable: other pages and `src/components/` link to them.
- `notes/` and `reports/` are local, git-ignored working material; never commit them.
- After changing the hero, chapter titles or roadmap groups, regenerate the media
  (see "Media previews" in CONTRIBUTING.md).
- Conversation may be in Chinese; code, commits and file names are English.
