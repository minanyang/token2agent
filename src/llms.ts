// llms.txt (https://llmstxt.org): a plain-text map of the site for AI tools, built from the docs collection.
// One file per language: /llms.txt (zh-TW) and /en/llms.txt, each pointing to the other.
import { getCollection } from 'astro:content';
import type { Lang } from './i18n';

const site = 'https://token2agent.com';

const copy = {
	'zh-TW': {
		summary: '從 token 到 agent 的 AI/LLM 學習路線（繁體中文）。The AI/LLM roadmap, from tokens to agents.',
		other: `English edition: ${site}/en/llms.txt`,
	},
	en: {
		summary: 'The AI/LLM roadmap, from tokens to agents (English edition).',
		other: `繁體中文版（Traditional Chinese edition）: ${site}/llms.txt`,
	},
} satisfies Record<Lang, { summary: string; other: string }>;

export async function llmsTxt(lang: Lang): Promise<Response> {
	const prefix = lang === 'en' ? 'en/' : '';
	const docs = await getCollection('docs');
	const line = (id: string) => {
		const entry = docs.find((e) => e.id === `${prefix}${id}`);
		if (!entry) throw new Error(`llms.txt: missing page ${prefix}${id}`);
		return `- [${entry.data.title}](${site}/${prefix}${id}/): ${entry.data.description ?? ''}`;
	};
	const stages = docs
		.filter((e) => e.id.startsWith('stages/'))
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((e) => line(e.id));

	const body = [
		'# Token2Agent',
		'',
		`> ${copy[lang].summary}`,
		'',
		'20 chapters: an introduction and six parts, from how text becomes tokens to agent systems that can be evaluated, secured and shipped. Each chapter has a self-contained lecture, self-checks and spec-only exercises. Content is CC BY-NC-SA 4.0.',
		'',
		copy[lang].other,
		'',
		'## Start here',
		'',
		line('stages/s00-big-picture'),
		line('guide/how-to-use'),
		line('guide/app-first'),
		'',
		'## Chapters',
		'',
		...stages,
		'',
		'## Hands-on projects',
		'',
		line('projects/system-thread'),
		line('projects/model-thread'),
		'',
		'## Reference',
		'',
		line('reference/glossary'),
		line('reference/concepts'),
		line('reference/sources'),
		line('guide/math-refresher'),
		'',
	].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
