// Markdown edition of every docs page, at the page URL plus `.md` (/stages/s06-llm-api/ → /stages/s06-llm-api.md).
// worker/index.ts serves it to requests that prefer text/markdown; the home pages use llms.txt instead.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

const homes = new Set(['index', 'en']);

export const getStaticPaths = (async () => {
	const docs = await getCollection('docs');
	return docs.filter((entry) => !homes.has(entry.id)).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({ props: { entry } }) => {
	// MDX-only lines that mean nothing as Markdown: imports and self-closing components such as <ShowcaseGrid />.
	const body = (entry.body ?? '').replace(/^(import .+|<[A-Z]\w* \/>)\n/gm, '');
	const { title, description } = entry.data;
	const markdown = [`# ${title}`, '', ...(description ? [`> ${description}`, ''] : []), body.trim(), ''].join('\n');
	return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
