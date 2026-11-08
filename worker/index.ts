// Sends readers whose browser prefers a language other than Chinese to the English pages, once per visit.
// Everything else is the static Astro build, served unchanged from the ASSETS binding.
//
// - An explicit choice in the language picker (cookie `t2a-lang`, set in src/components/LanguageSelect.astro) wins.
// - Without the cookie, the top `Accept-Language` entry decides; `zh*`, `*` or no header (most crawlers) stay on zh-TW,
//   so search engines keep indexing the root locale.
// - Only root-locale pages are redirected; /en/ pages and files (anything with an extension) never are.

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

const COOKIE = 't2a-lang';

function topLanguage(header: string | null): string | undefined {
	if (!header) return undefined;
	return header
		.split(',')
		.map((part) => {
			const [tag = '', ...params] = part.trim().split(';');
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			return { tag: tag.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
		})
		.filter((l) => l.tag && l.q > 0)
		.sort((a, b) => b.q - a.q)[0]?.tag;
}

function wantsEnglish(request: Request): boolean {
	const cookie = request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
	if (cookie) return cookie === 'en';
	const top = topLanguage(request.headers.get('Accept-Language'));
	return top !== undefined && top !== '*' && !top.startsWith('zh');
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const isRootPage = pathname !== '/en' && !pathname.startsWith('/en/') && !/\.[a-z0-9]+$/i.test(pathname);

		if (isRootPage && (request.method === 'GET' || request.method === 'HEAD') && wantsEnglish(request)) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/en${pathname}${url.search}`, Vary: 'Accept-Language, Cookie' },
			});
		}

		const response = await env.ASSETS.fetch(request);
		if (!isRootPage) return response;
		const varied = new Response(response.body, response);
		varied.headers.append('Vary', 'Accept-Language, Cookie');
		return varied;
	},
};
