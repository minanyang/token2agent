# Contributing

**English** · [繁體中文](CONTRIBUTING.zh-TW.md)

Thanks for helping out. This guide covers how to share your project, report problems, and the rules for changing content.

## Share your project

1. Fork [minanyang/token2agent](https://github.com/minanyang/token2agent).
2. Copy `src/data/showcase/_template.yaml` to `src/data/showcase/your-project.yaml` (lowercase letters and hyphens) and fill it in following the comments. The name and summary can be in English.
3. Open a pull request titled "Showcase: project name".

The criteria are on the [showcase](https://token2agent.com/en/showcase/) page. By opening the PR you agree that the site may display the name, summary, links and author name you provide; your project keeps its own license.

## Report a problem

Found an error, outdated content or a broken link? Open an issue saying which page and which section, and what you believe is correct, with a source. Small typos can go straight to a pull request.

## Development setup

You need Node.js 22.23 or later (required by Astro) and pnpm.

```sh
pnpm install
pnpm dev             # local dev server
pnpm build           # static output to dist/
pnpm check:sources   # every external link must be listed in reference/sources.md
```

Make sure `pnpm build` and `pnpm check:sources` pass before opening a PR.

## Media previews

`scripts/generate-media.mjs` generates both languages' hero GIFs, roadmap GIFs and OG cards from a
local build. Hero GIFs and OG cards share one layout without navigation buttons; GIFs animate the
demonstration and OG cards show its completed state. Regenerate these assets after changing the hero,
stage titles or roadmap groups, and inspect both themes and languages before committing them.

Run `pnpm build`, serve `dist/` with `pnpm astro preview --host 127.0.0.1 --port 4322`, and start an
isolated headless Chrome with remote debugging on port 9333. Then run:

```sh
node scripts/generate-media.mjs http://127.0.0.1:4322 http://127.0.0.1:9333
```

Use `--social-only` for hero GIFs and OG cards, or `--og-only` for static cards alone. The script prints
temporary QA frame paths.

## Project structure

```
src/content/docs/
  index.mdx          home page and roadmap overview (Traditional Chinese, the root locale)
  guide/             how to use the site, app-first route, model crash course, math refresher
  stages/s00–s19     one page per chapter
  projects/          model projects (M1–M5), system projects (A6–A19)
  reference/         sources, glossary, concept index
  showcase.mdx       showcase page
  en/                English edition, same file names and slugs
src/data/showcase/   showcase data, one YAML file per project
src/components/      home roadmap, reading-mode toggle and other components
templates/stage.md   chapter template with the full authoring rules
```

## Languages

Traditional Chinese (Taiwan) is the source text and lives at the site root. The English edition under `src/content/docs/en/` (URL `/en/`) is a localized translation that follows [`templates/translation-en.md`](templates/translation-en.md).

- **Fixing the English edition only** (wording, typos, an English-only example): edit the page under `en/`.
- **Changing what a chapter teaches** (a fact, number, step or acceptance criterion): change both languages, or describe the change in the PR and note that the Chinese page still needs it. Either is fine.

Simplified Chinese and Japanese are planned under `/zh-cn/` and `/ja/`. If you'd like to help translate, open an issue first so work isn't duplicated.

## Authoring rules

- **Write it yourself.** Explain in your own words with your own examples. Facts, numbers and formulas may be cited, but don't copy or translate text, figures or examples sentence by sentence; keep quotes short and attributed.
- **Codes always carry names.** Write "S6 LLM APIs and Application Basics" or "A10 Toolset and MCP Server", not a bare code. Ranges carry the part or project name, e.g. "Part I Models (S1–S5)".
- **External links** must all be listed in [`src/content/docs/reference/sources.md`](src/content/docs/reference/sources.md) with the date they were added. `pnpm check:sources` lists unregistered URLs.
- **Each concept is first taught once.** Other chapters point back with "(← S2 Transformers and Decoding)"; update the [concept index](src/content/docs/reference/concepts.md) when this changes.
- **Two reading depths.** What a first-time reader needs goes in the main text; derivations, implementation detail and optional topics go in `<details class="deep">` or `<section class="deep-section">`.
- **Exercises are specs only**: goal, steps, acceptance criteria with numbers, and hints. No solutions.

The full checklist is in the comment at the top of [`templates/stage.md`](templates/stage.md).

## License

Contributions to the content (`src/content/docs/`) are released under [CC BY-NC-SA 4.0](LICENSE); contributions to the code are released under the [MIT License](LICENSE-code).
