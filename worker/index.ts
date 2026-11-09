// Sends readers whose browser prefers a language other than Chinese to the English pages, once per visit, and serves
// the Markdown edition of a page to clients that ask for it. Everything else is the static Astro build, served
// unchanged from the ASSETS binding.
//
// - A request that prefers `text/markdown` over `text/html` (AI agents; browsers never send it) gets the page's `.md`
//   file (src/pages/[...slug].md.ts), or llms.txt for the home pages, for the URL it asked for: no language redirect.
// - Every HTML page points to its Markdown edition with a `Link: rel="alternate"` header.
// - Known crawlers are never redirected: search engines and AI tools rely on hreflang, so every URL must serve
//   its own page to them.
// - An explicit choice in the language picker (cookie `t2a-lang`, set in src/components/LanguageSelect.astro) wins.
// - Without the cookie, the top `Accept-Language` entry decides; `zh*`, `*` or no header (most crawlers) stay on zh-TW,
//   so search engines keep indexing the root locale.
// - Only root-locale pages are redirected; /en/ pages and files (anything with an extension) never are.

type Env = { ASSETS: { fetch(request: Request | URL): Promise<Response> } };

const COOKIE = 't2a-lang';

// Search engine and AI crawlers/fetchers, matched on the User-Agent. `bot\b` covers Googlebot, bingbot, GPTBot,
// OAI-SearchBot, ClaudeBot, PerplexityBot, Applebot and most others; the rest are user-triggered AI fetchers.
const CRAWLER = /bot\b|crawler|spider|slurp|Google-InspectionTool|ChatGPT-User|Claude-User|Perplexity-User|meta-externalagent/i;

// Parses a header of comma-separated values with optional `;q=` weights (Accept, Accept-Language), lowercased.
function weighted(header: string | null): { value: string; q: number }[] {
	if (!header) return [];
	return header
		.split(',')
		.map((part) => {
			const [value = '', ...params] = part.trim().split(';');
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			return { value: value.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
		})
		.filter((l) => l.value && l.q > 0);
}

function topLanguage(header: string | null): string | undefined {
	return weighted(header).sort((a, b) => b.q - a.q)[0]?.value;
}

function wantsEnglish(request: Request): boolean {
	if (CRAWLER.test(request.headers.get('User-Agent') ?? '')) return false;
	const cookie = request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
	if (cookie) return cookie === 'en';
	const top = topLanguage(request.headers.get('Accept-Language'));
	return top !== undefined && top !== '*' && !top.startsWith('zh');
}

function wantsMarkdown(request: Request): boolean {
	const types = weighted(request.headers.get('Accept'));
	const q = (type: string) => types.find((t) => t.value === type)?.q ?? 0;
	return q('text/markdown') > 0 && q('text/markdown') >= q('text/html');
}

// /stages/s06-llm-api/ → /stages/s06-llm-api.md; the home pages map to their llms.txt.
function markdownPath(pathname: string): string {
	const page = pathname.replace(/\/$/, '');
	if (page === '') return '/llms.txt';
	if (page === '/en') return '/en/llms.txt';
	return `${page}.md`;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const isPage = !/\.[a-z0-9]+$/i.test(pathname);
		const isRootPage = isPage && pathname !== '/en' && !pathname.startsWith('/en/');
		const isRead = request.method === 'GET' || request.method === 'HEAD';

		if (isPage && isRead && wantsMarkdown(request)) {
			const markdown = await env.ASSETS.fetch(new URL(markdownPath(pathname), url));
			if (markdown.ok) {
				return new Response(markdown.body, {
					headers: {
						'Content-Type': 'text/markdown; charset=utf-8',
						Link: `<${pathname.replace(/\/?$/, '/')}>; rel="canonical"`,
						Vary: 'Accept',
					},
				});
			}
		}

		if (isRootPage && isRead && wantsEnglish(request)) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/en${pathname}${url.search}`, Vary: 'Accept, Accept-Language, Cookie' },
			});
		}

		const response = await env.ASSETS.fetch(request);
		if (!isPage) return response;
		const page = new Response(response.body, response);
		page.headers.append('Vary', isRootPage ? 'Accept, Accept-Language, Cookie' : 'Accept');
		if (response.ok) page.headers.append('Link', `<${markdownPath(pathname)}>; rel="alternate"; type="text/markdown"`);
		return page;
	},
};
