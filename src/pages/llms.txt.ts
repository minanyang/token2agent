// llms.txt (https://llmstxt.org): a plain-text map of the site for AI tools, built from the docs collection.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const site = 'https://token2agent.com';

export const GET: APIRoute = async () => {
	const docs = await getCollection('docs');
	const line = (id: string) => {
		const entry = docs.find((e) => e.id === id);
		if (!entry) throw new Error(`llms.txt: missing page ${id}`);
		return `- [${entry.data.title}](${site}/${id}/): ${entry.data.description ?? ''}`;
	};
	const stages = docs
		.filter((e) => e.id.startsWith('stages/'))
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((e) => line(e.id));

	const body = [
		'# Token2Agent',
		'',
		'> 從 token 到 agent 的 AI/LLM 學習路線（繁體中文）。The AI/LLM roadmap, from tokens to agents.',
		'',
		'20 chapters in seven parts, from how text becomes tokens to agent systems that can be evaluated, secured and shipped. Each chapter has a self-contained lecture, self-checks and spec-only exercises. Content is CC BY-NC-SA 4.0.',
		'',
		'## Start here',
		'',
		line('guide/how-to-use'),
		line('guide/app-first'),
		'',
		'## Chapters',
		'',
		...stages,
		'',
		'## Hands-on threads',
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
};
