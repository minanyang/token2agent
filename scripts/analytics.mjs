// Writes an HTML traffic report for token2agent.com, plus the raw data as JSON next to it: zone traffic (the dashboard's
// Overview and Visitors numbers) split into bots and browsers, verified bots and AI crawlers with sitemap coverage,
// scanners, Web Analytics (human visits, referrers, Core Web Vitals) and Google Search Console.
// Uses the Cloudflare GraphQL Analytics API with Wrangler's credentials (`wrangler login` or CLOUDFLARE_API_TOKEN);
// the Search Console section runs scripts/search-console.mjs and is skipped when its key is missing.
// Usage: node scripts/analytics.mjs [days] [out.html]   (default 1 day, written to reports/analytics/)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const host = 'token2agent.com';
const origin = `https://${host}`;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const aiCategories = ['AI Crawler', 'AI Search', 'AI Assistant'];
const crawlerCategories = [...aiCategories, 'Search Engine Crawler'];
// Free-plan adaptive datasets keep about 31 days, so a previous period is only compared when it fits.
const retentionDays = 30;

// ---- Classification rules (exported for tests) ----

export const crawlerNamePattern =
	/bot\b|bot\/|crawler|spider|claude|anthropic|gptbot|chatgpt|oai-searchbot|perplexity|bytespider|ccbot|meta-external|amazonbot|applebot|cohere|heritrix|externalhit/i;
const toolAgent = /^$|curl|wget|python|aiohttp|go-http|^node|axios|okhttp|java\/|headless|scrapy|libwww|httpclient|^http/i;
export const scanPath = /\.env|\.git|\.svn|wp-|\.php|_environment|credentials|appsettings|\.aws|\.ssh|actuator|\.docker|\.DS_Store/i;
// Tools the site owner runs: Search Console live tests, Cloudflare's Agent Readiness scan, Lighthouse / PageSpeed.
export const selfTriggered = /Google-InspectionTool|Cloudflare-AgentReadiness|Chrome-Lighthouse|Google-PageSpeed|Google-Site-Verification/i;
const aiReferrer = /chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google|copilot\.microsoft|bing\.com\/chat|you\.com|phind|kagi/i;

/** The bot's own name from a user agent, e.g. "ClaudeBot" or "Google-InspectionTool". */
export const crawlerName = (ua) =>
	ua.match(/[\w-]*(?:bot|agent|other|fetcher|spider|inspectiontool|readiness|lighthouse)[\w-]*(?=\/|;|\)|$)/i)?.[0] ??
	ua.match(/^(?!Mozilla)[\w.-]+(?=\/)/)?.[0] ??
	ua.slice(0, 60);

/** Major versions a browser user agent claims; Safari's "Version/" is used for iOS and macOS Safari. */
export const browserVersions = (ua) => ({
	chrome: Number(ua.match(/(?:Chrome|CriOS)\/(\d+)/)?.[1]) || null,
	firefox: Number(ua.match(/Firefox\/(\d+)/)?.[1]) || null,
	safari: /Chrome|CriOS|Android/.test(ua) ? null : Number(ua.match(/Version\/(\d+)/)?.[1]) || null,
});

/** The newest browser versions seen, used as "current"; browsers auto-update, so real visitors sit near them. */
export const latestVersions = (agents) => {
	const latest = { chrome: 0, firefox: 0, safari: 0 };
	for (const ua of agents) for (const [k, v] of Object.entries(browserVersions(ua))) if (v > latest[k]) latest[k] = v;
	return latest;
};

// Chrome and Firefox ship a major version about every four weeks, Safari once a year.
const staleBy = { chrome: 12, firefox: 12, safari: 2 };
/** A browser version more than about a year behind the newest one seen. */
export const isOutdated = (ua, latest) =>
	Object.entries(browserVersions(ua)).some(([k, v]) => v && latest[k] && v < latest[k] - staleBy[k]);

/** Class of a request Cloudflare did not verify as a bot. */
export const agentClass = (ua, latest) => {
	if (crawlerNamePattern.test(ua)) return 'crawler name, unverified';
	if (toolAgent.test(ua)) return 'tool or headless';
	return isOutdated(ua, latest) ? 'browser-like, outdated version' : 'browser-like, current version';
};

/** How a verified bot fetched pages: on demand (someone shared a link or asked an assistant) or as a crawl. */
export const crawlPattern = ({ category, pages, robots }) => {
	if (category === 'AI Assistant' || category === 'Page Preview') return 'on demand';
	if (robots > 0 || pages >= 10) return 'crawl';
	return 'occasional';
};

export const sourceClass = (refererHost) => {
	if (!refererHost) return 'direct / none';
	if (refererHost.endsWith(host)) return 'internal';
	if (aiReferrer.test(refererHost)) return 'AI assistant';
	if (/google\.|bing\.|duckduckgo|yahoo|baidu|yandex|ecosia|brave\.com/i.test(refererHost)) return 'search engine';
	if (/threads|facebook|instagram|linkedin|twitter|x\.com|t\.co|reddit|bsky|mastodon|ptt|dcard/i.test(refererHost)) return 'social';
	if (/github|gitlab/i.test(refererHost)) return 'code hosting';
	return 'other';
};

/** Paths listed in a sitemap or sitemap index XML. */
export const sitemapLocs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'));

/** Which queries returned exactly as many rows as their limit, meaning rows were cut off. */
export const truncatedQueries = (results, limits) =>
	Object.entries(limits)
		.filter(([name, limit]) => limit > 1 && (results[name]?.length ?? 0) >= limit)
		.map(([name]) => name);

// ---- Data collection ----

const tally = (rows, key, weight = (r) => r.count) => {
	const totals = new Map();
	for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + weight(row));
	return [...totals].sort((a, b) => b[1] - a[1]);
};
const total = (rows, weight = (r) => r.count) => rows.reduce((n, r) => n + weight(r), 0);
const pct = (n, of) => (of ? `${((n / of) * 100).toFixed(1)}%` : '-');
const visits = (r) => r.sum.visits;

function cloudflare() {
	const token = execFileSync('npx', ['wrangler', 'auth', 'token'], { encoding: 'utf8', cwd: root }).trim().split('\n').at(-1);
	return async (path, init) => {
		const res = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
			...init,
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		});
		const body = await res.json();
		if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
		return body;
	};
}

async function collect(api, zone, from, to) {
	const limits = {};
	// Each query is aliased; its limit is recorded so a result that fills it can be reported as cut off.
	const q = (name, dataset, limit, filter, fields, extra = '') => {
		limits[name] = limit;
		return `${name}: ${dataset}(limit: ${limit}, filter: { ${filter} }${extra}) { ${fields} }`;
	};
	const t = `datetime_geq: "${from}", datetime_lt: "${to}"`;
	const verified = `${t}, verifiedBotCategory_neq: ""`;
	const rum = `${t}, requestHost: "${host}", bot: 0`;
	const query = `{ viewer {
		zones(filter: { zoneTag: "${zone.id}" }) {
			${q('daily', 'httpRequests1dGroups', 400, `date_geq: "${from.slice(0, 10)}", date_lt: "${to.slice(0, 10)}"`, 'dimensions { date } sum { requests pageViews cachedRequests } uniq { uniques }', ', orderBy: [date_ASC]')}
			${q('visitors', 'httpRequestsOverviewAdaptiveGroups', 1, t, 'sum { requests pageViews visits }')}
			${q('status', 'httpRequestsAdaptiveGroups', 100, t, 'count dimensions { edgeResponseStatus }')}
			${q('html', 'httpRequestsAdaptiveGroups', 5000, `${t}, edgeResponseContentTypeName: "html"`, 'count sum { visits } dimensions { verifiedBotCategory userAgent }')}
			${q('bots', 'httpRequestsAdaptiveGroups', 2000, verified, 'count dimensions { verifiedBotCategory userAgent edgeResponseContentTypeName }')}
			${q('botPages', 'httpRequestsAdaptiveGroups', 5000, `${verified}, edgeResponseContentTypeName: "html"`, 'count dimensions { verifiedBotCategory userAgent clientRequestPath }')}
			${q('botHours', 'httpRequestsAdaptiveGroups', 5000, verified, 'count dimensions { verifiedBotCategory userAgent datetimeHour }')}
			${q('botRobots', 'httpRequestsAdaptiveGroups', 500, `${verified}, clientRequestPath_in: ["/robots.txt", "/sitemap-index.xml", "/sitemap-0.xml"]`, 'count dimensions { verifiedBotCategory userAgent }')}
			${q('unverified', 'httpRequestsAdaptiveGroups', 5000, `${t}, verifiedBotCategory: ""`, 'count dimensions { userAgent clientRequestPath edgeResponseStatus }', ', orderBy: [count_DESC]')}
		}
		accounts(filter: { accountTag: "${zone.account.id}" }) {
			${q('pages', 'rumPageloadEventsAdaptiveGroups', 5000, rum, 'count sum { visits } dimensions { date requestPath refererHost countryName deviceType }')}
			${q('perf', 'rumPerformanceEventsAdaptiveGroups', 1, rum, 'quantiles { firstContentfulPaintP75 pageLoadTimeP50 pageLoadTimeP75 }')}
			${q('vitals', 'rumWebVitalsEventsAdaptiveGroups', 5000, rum, 'sum { lcpGood lcpNeedsImprovement lcpPoor inpGood inpNeedsImprovement inpPoor clsGood clsNeedsImprovement clsPoor } dimensions { requestPath deviceType largestContentfulPaintElement cumulativeLayoutShiftElement }')}
		}
	} }`;
	const { data } = await api('graphql', { method: 'POST', body: JSON.stringify({ query }) });
	const results = { from, to, ...data.viewer.zones[0], ...data.viewer.accounts[0] };
	results.truncated = truncatedQueries(results, limits);
	return results;
}

function searchConsole(days, outDir) {
	const file = join(outDir, `gsc-${process.pid}.json`);
	try {
		execFileSync('node', [join(root, 'scripts/search-console.mjs'), String(days), '--output', file], { cwd: root, stdio: 'ignore' });
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return { error: 'scripts/search-console.mjs failed; run it directly to see why (usually a missing key).' };
	} finally {
		rmSync(file, { force: true });
	}
}

// The site Worker writes one data point per request (worker/index.ts): blob1 path, blob3 what was served, blob4 user
// agent, blob5 "markdown" when Markdown was preferred, blob6 verified bot category, double1 status. The wrangler login
// cannot read the SQL API, so this needs a token with Account Analytics Read, from CLOUDFLARE_ANALYTICS_TOKEN or a file
// beside the Search Console key.
const analyticsTokenFile = join(homedir(), '.config/token2agent/cf-analytics-token');
async function workerLog(accountId, days) {
	let token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
	try {
		token ||= readFileSync(analyticsTokenFile, 'utf8').trim();
	} catch {}
	if (!token)
		return { error: `put an API token with Account Analytics Read in ${analyticsTokenFile} or CLOUDFLARE_ANALYTICS_TOKEN.` };
	const where = `timestamp > NOW() - INTERVAL '${Math.ceil(days * 24)}' HOUR`;
	const sql = async (query) => {
		const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body: `${query} FORMAT JSON`,
		});
		if (!res.ok) throw new Error(`Analytics Engine SQL API failed (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
		return (await res.json()).data.map((r) => ({ ...r, n: Number(r.n) }));
	};
	// _sample_interval weights each row back to the number of requests it stands for.
	const n = 'SUM(_sample_interval) AS n';
	try {
		const [served, markdown, mdFiles] = await Promise.all([
			sql(`SELECT blob3 AS served, blob5 AS wants, blob6 AS category, ${n} FROM token2agent_requests WHERE ${where} GROUP BY served, wants, category`),
			sql(`SELECT blob4 AS ua, blob6 AS category, blob1 AS path, ${n} FROM token2agent_requests WHERE ${where} AND blob3 = 'markdown' GROUP BY ua, category, path ORDER BY n DESC LIMIT 1000`),
			sql(`SELECT blob4 AS ua, blob6 AS category, double1 AS status, ${n} FROM token2agent_requests WHERE ${where} AND (blob1 LIKE '%.md' OR blob1 LIKE '%llms.txt') GROUP BY ua, category, status ORDER BY n DESC LIMIT 1000`),
		]);
		return { served, markdown, mdFiles };
	} catch (e) {
		return { error: e.message };
	}
}

async function sitemapPaths() {
	const get = async (url) => (await fetch(url, { signal: AbortSignal.timeout(30000) })).text();
	const index = sitemapLocs(await get(`${origin}/sitemap-index.xml`));
	const urls = (await Promise.all(index.map(async (url) => sitemapLocs(await get(url))))).flat();
	return urls.map((url) => new URL(url).pathname);
}

// ---- Analysis ----

function analyse(d) {
	const latest = latestVersions(d.html.map((r) => r.dimensions.userAgent));
	const ai = d.bots.filter((r) => aiCategories.includes(r.dimensions.verifiedBotCategory));
	const scans = d.unverified.filter((r) => scanPath.test(r.dimensions.clientRequestPath));
	const allRequests = total(d.status);
	const status4xx = total(d.status.filter((r) => r.dimensions.edgeResponseStatus >= 400 && r.dimensions.edgeResponseStatus < 500));
	const zone = d.visitors[0]?.sum ?? { requests: 0, pageViews: 0, visits: 0 };
	return {
		latest,
		ai,
		scans,
		summary: {
			allRequests,
			zonePageViews: zone.pageViews,
			zoneVisits: zone.visits,
			humanViews: total(d.pages),
			humanVisits: total(d.pages, visits),
			verifiedBots: total(d.bots),
			aiBots: total(ai),
			aiHtml: total(ai.filter((r) => r.dimensions.edgeResponseContentTypeName === 'html')),
			scans: total(scans),
			status4xx,
			aiReferrals: total(d.pages.filter((r) => sourceClass(r.dimensions.refererHost) === 'AI assistant'), visits),
		},
	};
}

/** One row per verified bot: requests, HTML fetches, distinct pages, robots.txt / sitemap reads and active hours. */
function botTable(d) {
	const key = (r) => `${r.dimensions.verifiedBotCategory} › ${crawlerName(r.dimensions.userAgent)}`;
	const bots = new Map();
	const bot = (r) => {
		const k = key(r);
		if (!bots.has(k))
			bots.set(k, { key: k, category: r.dimensions.verifiedBotCategory, name: crawlerName(r.dimensions.userAgent), requests: 0, html: 0, paths: new Set(), robots: 0, hours: new Set(), self: false });
		return bots.get(k);
	};
	for (const r of d.bots) {
		const b = bot(r);
		b.requests += r.count;
		if (r.dimensions.edgeResponseContentTypeName === 'html') b.html += r.count;
		b.self ||= selfTriggered.test(r.dimensions.userAgent);
	}
	for (const r of d.botPages) bot(r).paths.add(r.dimensions.clientRequestPath);
	for (const r of d.botRobots) bot(r).robots += r.count;
	for (const r of d.botHours) bot(r).hours.add(r.dimensions.datetimeHour);
	return [...bots.values()]
		.map((b) => ({ ...b, pages: b.paths.size, pattern: crawlPattern({ category: b.category, pages: b.paths.size, robots: b.robots }) }))
		.sort((a, b) => b.requests - a.requests);
}

// ---- Report ----

const sections = [];
const section = (title, note) => sections.push({ title, note, blocks: [] });
const add = (block) => sections.at(-1).blocks.push(block);
const stats = (items) => add({ kind: 'stats', items });
const list = (title, entries, { limit = 10, of, note, from } = {}) =>
	add({ kind: 'list', title, note, of, from, rows: entries.slice(0, limit), more: Math.max(0, entries.length - limit) });
const grid = (title, head, rows, { note, from, wide = true } = {}) => add({ kind: 'grid', title, head, rows, note, from, wide });

function build({ days, since, until, d, prev, sitemap, gsc, log }) {
	const { latest, ai, scans, summary: s } = analyse(d);
	const p = prev && analyse(prev).summary;
	const delta = (k) => {
		if (!p) return '';
		if (!p[k]) return s[k] ? 'new vs previous period' : 'same as previous period';
		const change = ((s[k] - p[k]) / p[k]) * 100;
		return `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}% vs previous (${p[k].toLocaleString('en-US')})`;
	};
	const verifiedHtml = d.html.filter((r) => r.dimensions.verifiedBotCategory);
	const unverifiedHtml = d.html.filter((r) => !r.dimensions.verifiedBotCategory);
	const htmlVisits = total(d.html, visits);
	const bots = botTable(d);

	section(
		'Summary',
		`Zone and adaptive counts are sampled estimates. Web Analytics counts only browsers that ran the beacon, with bots excluded.${
			prev ? ` Changes compare with ${prev.from.slice(0, 10)} → ${prev.to.slice(0, 10)}.` : ` No comparison: the previous ${days} days fall outside the ${retentionDays}-day retention.`
		}`,
	);
	if (d.truncated.length)
		add({ kind: 'warning', text: `These queries hit their row limit, so tables built from them are incomplete: ${d.truncated.join(', ')}.` });
	stats([
		['Zone requests', s.allRequests, delta('allRequests')],
		['Zone page views', s.zonePageViews, `${s.zoneVisits.toLocaleString('en-US')} zone visits · ${delta('zonePageViews')}`],
		['Human page views', s.humanViews, delta('humanViews')],
		['Human visits', s.humanVisits, delta('humanVisits')],
		['Human share of zone visits', pct(s.humanVisits, s.zoneVisits), 'Web Analytics visits ÷ zone visits'],
		['Verified bot requests', s.verifiedBots, `${pct(s.verifiedBots, s.allRequests)} of all · ${delta('verifiedBots')}`],
		['Verified AI bot requests', s.aiBots, `${pct(s.aiBots, s.allRequests)} of all · ${delta('aiBots')}`],
		['HTML pages read by AI bots', s.aiHtml, `the rest are JS, CSS and other assets · ${delta('aiHtml')}`],
		['Scanner requests', s.scans, `${pct(s.scans, s.allRequests)} of all · ${delta('scans')}`],
		['4xx responses', s.status4xx, `${pct(s.status4xx, s.allRequests)} of all`],
		['Visits from AI assistants', s.aiReferrals, 'referrer is ChatGPT, Perplexity, Claude, Gemini…'],
	]);

	section('Zone traffic', 'The numbers on the dashboard Overview and Analytics › Visitors pages; bots included.');
	grid(
		'By UTC day',
		['Date', 'Requests', 'Page views', 'Unique IPs', 'Cached requests'],
		d.daily.map(({ dimensions, sum, uniq }) => [dimensions.date, sum.requests, sum.pageViews, uniq.uniques, sum.cachedRequests]),
		{ note: 'Whole UTC days that overlap the window. Unique IPs are counted per day and cannot be added across days.', from: 'daily' },
	);
	list('Response status', tally(d.status, (r) => r.dimensions.edgeResponseStatus), { limit: 12, of: s.allRequests, from: 'status' });

	section(
		'Why zone visits and Web Analytics visits differ',
		'A zone visit is an HTML page view whose Referer is missing or from another site, so every bot fetch without a Referer counts as a visit.',
	);
	list(
		'Zone HTML visits by source',
		[
			...tally(verifiedHtml, (r) => `verified bot: ${r.dimensions.verifiedBotCategory}`, visits),
			...tally(unverifiedHtml, (r) => `not verified: ${agentClass(r.dimensions.userAgent, latest)}`, visits),
		].sort((a, b) => b[1] - a[1]),
		{
			limit: 20,
			of: htmlVisits,
			from: 'html',
			note: `Outdated means more than about a year behind the newest version seen (Chrome ${latest.chrome}, Firefox ${latest.firefox}, Safari ${latest.safari}). Web Analytics human visits for comparison: ${s.humanVisits} (${pct(s.humanVisits, htmlVisits)} of zone HTML visits).`,
		},
	);
	for (const kind of ['outdated', 'current'])
		grid(
			`Browser-like user agents, ${kind} version, with the most zone visits`,
			['User agent', 'Visits', 'Requests'],
			tally(
				unverifiedHtml.filter((r) => agentClass(r.dimensions.userAgent, latest) === `browser-like, ${kind} version`),
				(r) => r.dimensions.userAgent,
				visits,
			)
				.slice(0, 10)
				.map(([ua, v]) => [ua, v, total(unverifiedHtml.filter((r) => r.dimensions.userAgent === ua))]),
			{ from: 'html' },
		);

	section(
		'Verified bots and AI crawlers',
		'Categories are Cloudflare\'s verified bot categories, the same ones AI Crawl Control uses. AI = AI Crawler, AI Search and AI Assistant.',
	);
	list('Verified bots by category', tally(d.bots, (r) => r.dimensions.verifiedBotCategory), { limit: 15, of: s.verifiedBots, from: 'bots' });
	grid(
		'Verified bots by name',
		['Category › bot', 'Requests', 'HTML', 'Pages', 'robots.txt / sitemap', 'Active hours', 'Pattern', 'Note'],
		bots.map((b) => [b.key, b.requests, b.html, b.pages, b.robots, b.hours.size, b.pattern, b.self ? 'likely you (owner tool)' : '']),
		{
			from: ['bots', 'botPages', 'botRobots', 'botHours'],
			note: 'Pattern: "on demand" for AI Assistant and Page Preview (a person asked an assistant or shared a link); "crawl" when the bot read robots.txt or a sitemap, or fetched 10+ pages; otherwise "occasional". Requests include JS and CSS fetched to render a page; HTML is the pages themselves.',
		},
	);
	if (sitemap.error) add({ kind: 'warning', text: `Sitemap coverage skipped: ${sitemap.error}` });
	else {
		const zh = sitemap.paths.filter((path) => !path.startsWith('/en/'));
		const en = sitemap.paths.filter((path) => path.startsWith('/en/'));
		const listed = new Set(sitemap.paths);
		const fetched = (category, name) =>
			new Set(
				d.botPages
					.filter((r) => r.dimensions.verifiedBotCategory === category && (!name || crawlerName(r.dimensions.userAgent) === name))
					.map((r) => r.dimensions.clientRequestPath)
					.filter((path) => listed.has(path)),
			);
		const cover = (set) => [`${set.size} / ${sitemap.paths.length}`, pct(set.size, sitemap.paths.length), `${zh.filter((x) => set.has(x)).length} / ${zh.length}`, `${en.filter((x) => set.has(x)).length} / ${en.length}`];
		grid(
			'Sitemap coverage by AI and search crawlers',
			['Category › bot', 'Sitemap pages fetched', 'Coverage', 'Chinese pages', 'English pages'],
			bots
				.filter((b) => crawlerCategories.includes(b.category) && b.pages)
				.map((b) => [b.key, ...cover(fetched(b.category, b.name))]),
			{ from: 'botPages', note: `The live sitemap lists ${sitemap.paths.length} pages (${zh.length} Chinese, ${en.length} English). Only verified bots count.` },
		);
		const anyAi = new Set(aiCategories.flatMap((c) => [...fetched(c)]));
		list(
			'Sitemap pages no verified AI bot fetched',
			sitemap.paths.filter((path) => !anyAi.has(path)).map((path) => [path, 0]),
			{ limit: 40, from: 'botPages', note: `${sitemap.paths.length - anyAi.size} of ${sitemap.paths.length} sitemap pages.` },
		);
	}
	const named = d.unverified.filter((r) => crawlerNamePattern.test(r.dimensions.userAgent));
	list(
		'Unverified crawler names that were served',
		tally(
			named.filter((r) => r.dimensions.edgeResponseStatus < 400 && !scanPath.test(r.dimensions.clientRequestPath)),
			(r) => crawlerName(r.dimensions.userAgent),
		),
		{ limit: 15, from: 'unverified', note: '2xx/3xx on normal paths: a crawler name that is not on Cloudflare\'s verified list.' },
	);
	list(
		'Unverified crawler names on scanner paths or 4xx',
		tally(
			named.filter((r) => r.dimensions.edgeResponseStatus >= 400 || scanPath.test(r.dimensions.clientRequestPath)),
			(r) => crawlerName(r.dimensions.userAgent),
		),
		{ limit: 15, from: 'unverified', note: 'Likely spoofed: a crawler name used by a scanner.' },
	);

	section(
		'Worker log',
		'Recorded by the site Worker through Workers Analytics Engine: requests it handled (not /_astro or /pagefind assets), with what it served. Starts on the day the logging was deployed.',
	);
	if (log.error) add({ kind: 'warning', text: `Worker log skipped: ${log.error}` });
	else {
		const handled = total(log.served, (r) => r.n);
		const label = (r) => (r.category ? `${r.category} › ${crawlerName(r.ua)}` : `not verified › ${crawlerName(r.ua)}`);
		stats([
			['Requests handled', handled],
			['Asked for Markdown', total(log.served.filter((r) => r.wants), (r) => r.n), 'Accept prefers text/markdown'],
			['Served Markdown', total(log.served.filter((r) => r.served === 'markdown'), (r) => r.n), 'through content negotiation'],
			['.md and llms.txt fetched', total(log.mdFiles, (r) => r.n), 'requested by URL'],
			['Language redirects', total(log.served.filter((r) => r.served === 'redirect'), (r) => r.n), 'root pages sent to /en/'],
		]);
		list('Requests by what was served', tally(log.served, (r) => r.served, (r) => r.n), { of: handled });
		list('Markdown served by negotiation, by agent', tally(log.markdown, label, (r) => r.n), { limit: 20 });
		list('Pages served as Markdown', tally(log.markdown, (r) => r.path, (r) => r.n), { limit: 20 });
		list('.md and llms.txt fetched by URL, by agent', tally(log.mdFiles, (r) => `${label(r)} (${r.status})`, (r) => r.n), { limit: 20 });
	}

	section('Scanners', `${s.scans.toLocaleString('en-US')} requests (${pct(s.scans, s.allRequests)} of all) to paths such as .env, .git and wp-admin.`);
	list('Scanner paths', tally(scans, (r) => r.dimensions.clientRequestPath), { limit: 15, from: 'unverified' });
	list('Scanner response codes', tally(scans, (r) => r.dimensions.edgeResponseStatus), { of: s.scans, from: 'unverified' });
	list('Scanner user agents', tally(scans, (r) => r.dimensions.userAgent), { limit: 8, from: 'unverified' });

	section('Human readers', 'Web Analytics, bots excluded.');
	const entry = (r) => /^\/(en\/)?$/.test(r.dimensions.requestPath);
	stats([
		['Page views', s.humanViews, delta('humanViews')],
		['Visits', s.humanVisits, delta('humanVisits')],
		['Page views per visit', s.humanVisits ? (s.humanViews / s.humanVisits).toFixed(2) : '-'],
		['Home page share', pct(total(d.pages.filter(entry)), s.humanViews), `${total(d.pages.filter(entry))} of ${s.humanViews} page views on / or /en/`],
	]);
	grid(
		'By UTC day',
		['Date', 'Page views', 'Visits'],
		tally(d.pages, (r) => r.dimensions.date)
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([date, views]) => [date, views, total(d.pages.filter((r) => r.dimensions.date === date), visits)]),
		{ from: 'pages' },
	);
	const external = d.pages.filter((r) => sourceClass(r.dimensions.refererHost) !== 'internal');
	list('Visits by source type', tally(external, (r) => sourceClass(r.dimensions.refererHost), visits), { of: s.humanVisits, from: 'pages' });
	list('Visits by referrer', tally(external, (r) => r.dimensions.refererHost || 'direct / none', visits), { limit: 15, from: 'pages' });
	list('Page views by path', tally(d.pages, (r) => r.dimensions.requestPath), { limit: 20, of: s.humanViews, from: 'pages' });
	list('Visits by country', tally(d.pages, (r) => r.dimensions.countryName, visits), { of: s.humanVisits, from: 'pages' });
	grid(
		'Page views per visit by country',
		['Country', 'Visits', 'Page views', 'Per visit'],
		tally(d.pages, (r) => r.dimensions.countryName, visits)
			.filter(([, v]) => v >= 3)
			.map(([c, v]) => {
				const views = total(d.pages.filter((r) => r.dimensions.countryName === c));
				return [c, v, views, (views / v).toFixed(1)];
			}),
		{ note: 'Countries with 3 or more visits.', from: 'pages', wide: false },
	);
	list('Visits by device', tally(d.pages, (r) => r.dimensions.deviceType, visits), { of: s.humanVisits, from: 'pages' });

	section('Google Search Console', gsc.error ? undefined : `${gsc.current.startDate} → ${gsc.current.endDate}, finalized Web data; Search Console lags about three days, so this window ends earlier than the rest of the report.`);
	if (gsc.error) add({ kind: 'warning', text: `Search Console skipped: ${gsc.error}` });
	else {
		const t = gsc.current.totals ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
		stats([
			['Clicks', t.clicks],
			['Impressions', t.impressions],
			['CTR', `${(t.ctr * 100).toFixed(2)}%`],
			['Average position', t.position ? t.position.toFixed(1) : '-'],
		]);
		const gscRows = (rows) => rows.slice(0, 20).map((r) => [r.keys[0].replace(origin, ''), r.clicks, r.impressions, `${(r.ctr * 100).toFixed(1)}%`, r.position.toFixed(1)]);
		grid('Top queries', ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'], gscRows(gsc.current.queries), { wide: false });
		grid('Top pages', ['Page', 'Clicks', 'Impressions', 'CTR', 'Position'], gscRows(gsc.current.pages), { wide: false });
		grid(
			'Sitemaps',
			['Sitemap', 'Last downloaded', 'Errors', 'Warnings'],
			gsc.sitemaps.map((m) => [m.path.replace(origin, ''), m.lastDownloaded?.slice(0, 10) ?? 'never', Number(m.errors), Number(m.warnings)]),
		);
	}

	section('Performance', 'Web Analytics, bots excluded.');
	const q = d.perf[0]?.quantiles;
	// RUM performance quantiles are reported in microseconds.
	if (q)
		stats([
			['Page load p50', `${q.pageLoadTimeP50 / 1000} ms`],
			['Page load p75', `${q.pageLoadTimeP75 / 1000} ms`],
			['FCP p75', `${q.firstContentfulPaintP75 / 1000} ms`],
		]);
	grid(
		'Core Web Vitals',
		['Metric', 'Good', 'Needs improvement', 'Poor', 'Poor share'],
		['lcp', 'inp', 'cls'].map((metric) => {
			const sum = (k) => d.vitals.reduce((n, r) => n + r.sum[metric + k], 0);
			return [metric.toUpperCase(), sum('Good'), sum('NeedsImprovement'), sum('Poor'), pct(sum('Poor'), sum('Good') + sum('NeedsImprovement') + sum('Poor'))];
		}),
		{ from: 'vitals' },
	);
	list(
		'Pages with poor LCP',
		tally(d.vitals.filter((r) => r.sum.lcpPoor), (r) => `${r.dimensions.requestPath} (${r.dimensions.deviceType}) ${r.dimensions.largestContentfulPaintElement}`, (r) => r.sum.lcpPoor),
		{ from: 'vitals' },
	);
	list(
		'Pages with poor CLS',
		tally(d.vitals.filter((r) => r.sum.clsPoor), (r) => `${r.dimensions.requestPath} (${r.dimensions.deviceType}) ${r.dimensions.cumulativeLayoutShiftElement}`, (r) => r.sum.clsPoor),
		{ from: 'vitals' },
	);

	return render({ days, since, until, truncated: d.truncated });
}

// User agents, paths and referrers come from the internet, so every value is escaped.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v);

function render({ days, since, until, truncated }) {
	const caption = (b) => {
		const cut = [b.from].flat().filter((name) => truncated.includes(name));
		return `<h3>${esc(b.title)}</h3>${cut.length ? `<p class="warn">Incomplete: ${esc(cut.join(', '))} hit its row limit.</p>` : ''}${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}`;
	};
	const renderBlock = (b) => {
		if (b.kind === 'warning') return `<div class="block wide warning">${esc(b.text)}</div>`;
		if (b.kind === 'stats')
			return `<div class="stats">${b.items
				.map(([label, value, sub]) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(fmt(value))}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`)
				.join('')}</div>`;
		if (b.kind === 'grid')
			return `<div class="block${b.wide ? ' wide' : ''}">${caption(b)}<table><thead><tr>${b.head.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
				b.rows.map((row) => `<tr>${row.map((c, i) => `<td${i ? ' class="num"' : ' class="label"'}>${esc(fmt(c))}</td>`).join('')}</tr>`).join('') ||
				'<tr><td class="empty">No data</td></tr>'
			}</tbody></table></div>`;
		const scale = b.of || Math.max(1, ...b.rows.map(([, n]) => n));
		const rows = b.rows
			.map(
				([label, n]) =>
					`<tr><td class="label">${esc(label === '' ? '(none)' : label)}</td><td class="num">${esc(fmt(n))}</td><td class="num muted">${b.of ? pct(n, b.of) : ''}</td><td class="bar"><span style="width:${((n / scale) * 100).toFixed(1)}%"></span></td></tr>`,
			)
			.join('');
		return `<div class="block">${caption(b)}<table>${rows || '<tr><td class="empty">No data</td></tr>'}</table>${b.more ? `<p class="note">+${b.more} more</p>` : ''}</div>`;
	};
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(host)} traffic report</title>
<style>
:root { --bg: #f7f7f5; --card: #fff; --text: #1d1d1b; --muted: #6b6b66; --line: #e4e4df; --bar: #3d7bd9; --bar-bg: #e8eef8; --warn-bg: #fdf3dc; --warn: #8a5a00; }
@media (prefers-color-scheme: dark) {
	:root { --bg: #151514; --card: #1f1f1d; --text: #ececea; --muted: #9a9a94; --line: #33332f; --bar: #6aa0f0; --bar-bg: #26303f; --warn-bg: #3a2f17; --warn: #f0c46a; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 64px; }
header h1 { margin: 0 0 4px; font-size: 24px; }
header p { margin: 0; color: var(--muted); overflow-wrap: anywhere; }
nav { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 16px 0 8px; }
nav a { color: var(--muted); text-decoration: none; font-size: 13px; }
nav a:hover { color: var(--text); }
section { margin-top: 36px; }
section > h2 { font-size: 18px; margin: 0 0 2px; }
section > .note { margin: 0 0 14px; }
.blocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 16px; }
.block, .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; }
.block { padding: 14px 16px; min-width: 0; overflow-x: auto; }
.block.wide { grid-column: 1 / -1; }
.block.warning { background: var(--warn-bg); color: var(--warn); border-color: transparent; }
.block h3 { font-size: 14px; margin: 0 0 2px; }
.note { color: var(--muted); font-size: 12.5px; margin: 0 0 8px; }
.warn { color: var(--warn); font-size: 12.5px; margin: 0 0 6px; }
.stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 12px; }
.stat { padding: 12px 14px; }
.stat .label { color: var(--muted); font-size: 12.5px; }
.stat .value { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat .sub { color: var(--muted); font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; color: var(--muted); font-size: 12.5px; border-bottom: 1px solid var(--line); padding: 4px 6px; }
td { padding: 4px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.muted, .empty { color: var(--muted); }
td.label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; word-break: break-all; }
td.bar { width: 28%; min-width: 80px; padding-right: 6px; background: linear-gradient(var(--bar-bg), var(--bar-bg)) no-repeat 6px 10px / calc(100% - 12px) 8px; }
td.bar span { display: block; height: 8px; margin-top: 6px; border-radius: 4px; background: var(--bar); min-width: 2px; }
footer { margin-top: 40px; color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<main>
<header>
<h1>${esc(host)} traffic report</h1>
<p>${esc(since)} → ${esc(until)} · ${days} day${days === 1 ? '' : 's'}</p>
</header>
<nav>${sections.map((s, i) => `<a href="#s${i + 1}">${i + 1}. ${esc(s.title)}</a>`).join('')}</nav>
${sections
	.map(
		(s, i) =>
			`<section id="s${i + 1}"><h2>${i + 1}. ${esc(s.title)}</h2>${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}<div class="blocks">${s.blocks.map(renderBlock).join('')}</div></section>`,
	)
	.join('\n')}
<footer>Generated by scripts/analytics.mjs from the Cloudflare GraphQL Analytics API and the Search Console API.</footer>
</main>
</body>
</html>
`;
}

export async function main(args = process.argv.slice(2)) {
	const days = Number(args[0] ?? 1);
	if (!(days > 0 && days <= retentionDays)) throw new Error(`Choose a number of days between 1 and ${retentionDays}.`);
	const now = Date.now();
	const iso = (ms) => new Date(ms).toISOString();
	const until = iso(now);
	const since = iso(now - days * 86_400_000);
	const out = resolve(args[1] ?? join(root, 'reports/analytics', `${until.slice(0, 10)}-${days}d.html`));
	mkdirSync(dirname(out), { recursive: true });

	const api = cloudflare();
	const zone = (await api(`zones?name=${host}`)).result[0];
	const [d, prev, sitemap, log] = await Promise.all([
		collect(api, zone, since, until),
		2 * days <= retentionDays ? collect(api, zone, iso(now - 2 * days * 86_400_000), since) : null,
		sitemapPaths().then((paths) => ({ paths }), (e) => ({ error: e.message })),
		workerLog(zone.account.id, days),
	]);
	const gsc = searchConsole(Math.max(1, Math.round(days)), tmpdir());

	writeFileSync(out, build({ days, since, until, d, prev, sitemap, gsc, log }));
	writeFileSync(
		out.replace(/\.html?$/, '') + '.json',
		JSON.stringify({ host, since, until, days, current: d, previous: prev, sitemap, searchConsole: gsc, workerLog: log }, null, 1),
	);
	console.log(out);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	main().catch((e) => {
		console.error(e.message);
		process.exitCode = 1;
	});
}
