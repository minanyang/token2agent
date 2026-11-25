// Read-only Google Search Console reporting. Credentials stay outside the repository.
// Usage: pnpm search-console [days] [--targets] [--inspect] [--end YYYY-MM-DD] [--output file.json]
// Default: 28 inclusive days ending three days before today in Pacific time, finalized data only.
import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const site = 'sc-domain:token2agent.com';
const origin = 'https://token2agent.com';
const property = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}`;

export const targets = [
	['evals', 'stages/s08-evals/', ['LLM 評估教學', 'Evals 教學', 'LLM judge'], ['LLM evaluation tutorial', 'LLM judge calibration', 'LLM as a judge']],
	['rag', 'stages/s09-rag/', ['RAG 教學', 'RAG 評估', 'RRF', 'Recall@k'], ['RAG evaluation tutorial', 'RAG evaluation metrics', 'reciprocal rank fusion', 'RRF python', 'Recall@k']],
	['agent-evals', 'stages/s14-agent-evals/', ['AI Agent 評估', 'Agent evals 教學'], ['AI agent evaluation tutorial', 'agent trajectory evaluation']],
	['transformer', 'stages/s02-transformer/', ['beam search'], ['beam search']],
	['roadmap', '', ['AI 學習路線', 'AI 学习路线', 'LLM 學習路線', 'AI Agent 學習路線'], ['AI roadmap', 'LLM learning roadmap', 'AI agent learning path']],
].flatMap(([topic, path, zh, en]) => [
	{ topic, language: 'zh-TW', page: `${origin}/${path}`, keywords: zh },
	{ topic, language: 'en', page: `${origin}/en/${path}`, keywords: en },
]);

export function shiftDate(date, days) {
	return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

export function parseOptions(args, now = new Date()) {
	const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
		targets: { type: 'boolean' }, inspect: { type: 'boolean' }, end: { type: 'string' },
		output: { type: 'string' }, help: { type: 'boolean' },
	} });
	const days = Number(positionals[0] ?? 28);
	if (positionals.length > 1 || !Number.isInteger(days) || days < 1 || days > 365) {
		throw new Error('Choose an integer number of days between 1 and 365.');
	}
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	const endDate = values.end ?? shiftDate(today, -3);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(Date.parse(endDate)) || shiftDate(endDate, 0) !== endDate || endDate > today) {
		throw new Error('--end must be a valid YYYY-MM-DD date no later than today in Pacific time.');
	}
	return { ...values, days, startDate: shiftDate(endDate, 1 - days), endDate,
		previousStartDate: shiftDate(endDate, 1 - 2 * days), previousEndDate: shiftDate(endDate, -days) };
}

// Pagination reduces row-limit loss; Google may still omit anonymized queries and other rows.
export async function fetchRows(api, body, pageSize = 25000) {
	const rows = [];
	for (let startRow = 0; ; startRow += pageSize) {
		const result = await api(`${property}/searchAnalytics/query`, { ...body, type: 'web', dataState: 'final', rowLimit: pageSize, startRow });
		const page = result.rows ?? [];
		rows.push(...page);
		if (page.length < pageSize) return rows;
	}
}

// A tracked phrase matches every reported query containing all of its words, so long-tail variants count.
// ASCII words must match whole query words; other words (such as Chinese) match as substrings.
export function matchesKeyword(query, keyword) {
	const words = (s) => s.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
	const queryWords = words(query);
	const joined = queryWords.join(' ');
	return words(keyword).every(w => /^[\x20-\x7e]+$/.test(w) ? queryWords.includes(w) : joined.includes(w));
}

function aggregate(rows) {
	if (!rows.length) return null;
	const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
	const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
	return { clicks, impressions, ctr: impressions ? clicks / impressions : 0,
		position: rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / impressions,
		queries: rows.map(r => r.keys[0]) };
}

export function targetResults(current, previous) {
	return targets.map(target => {
		const forPage = (period) => period.queryPages.filter(row => row.keys[1] === target.page);
		const observed = forPage(current);
		const match = (rows, keyword) => aggregate(rows.filter(row => matchesKeyword(row.keys[0], keyword)));
		return { ...target,
			pageMetrics: current.pages.find(row => row.keys[0] === target.page) ?? null,
			previousPageMetrics: previous.pages.find(row => row.keys[0] === target.page) ?? null,
			observedQueries: observed,
			keywords: target.keywords.map(keyword => ({ keyword, current: match(observed, keyword), previous: match(forPage(previous), keyword) })),
		};
	});
}

async function googleClient() {
	const key = JSON.parse(readFileSync(process.env.GSC_KEY ?? `${homedir()}/.config/token2agent/gsc-sa.json`, 'utf8'));
	const tokenUrl = 'https://oauth2.googleapis.com/token';
	const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email,
		scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: tokenUrl, iat: now, exp: now + 3600 })}`;
	const assertion = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')}`;
	const response = await fetch(tokenUrl, { method: 'POST', signal: AbortSignal.timeout(45000),
		body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
	const auth = await response.json();
	if (!response.ok || !auth.access_token) throw new Error(`Google OAuth failed (HTTP ${response.status}).`);
	return async (url, body) => {
		const res = await fetch(url, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(45000),
			headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
			body: body && JSON.stringify(body) });
		const json = await res.json();
		if (!res.ok || json.error) throw new Error(`Google API failed (HTTP ${res.status}, ${json.error?.status ?? 'unknown status'}).`);
		return json;
	};
}

async function inspectSitemap(api) {
	const res = await fetch(`${origin}/sitemap-0.xml`, { signal: AbortSignal.timeout(30000) });
	if (!res.ok) throw new Error(`Sitemap fetch failed (HTTP ${res.status}).`);
	const xml = await res.text();
	const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
	if (!urls.length) throw new Error('The live sitemap contained no URLs.');
	const results = [];
	let cursor = 0;
	await Promise.all(Array.from({ length: 4 }, async () => {
		while (cursor < urls.length) {
			const url = urls[cursor++];
			try {
				const { inspectionResult } = await api('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: site });
				const index = inspectionResult.indexStatusResult;
				const result = { url, ...index };
				if (index.verdict !== 'PASS') {
					const page = await fetch(url, { redirect: 'manual', headers: { 'Accept-Language': 'zh-TW' }, signal: AbortSignal.timeout(30000) });
					const html = await page.text();
					const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(m => m[0]).find(tag => /rel=["']canonical["']/.test(tag));
					result.live = { status: page.status, location: page.headers.get('location'),
						canonical: canonical?.match(/href=["']([^"']+)/)?.[1] ?? null,
						language: html.match(/<html\b[^>]*lang=["']([^"']+)/)?.[1] ?? null,
						noindex: /noindex/i.test(page.headers.get('x-robots-tag') ?? '') || /<meta\b(?=[^>]*name=["'](?:robots|googlebot)["'])(?=[^>]*content=["'][^"']*noindex)[^>]*>/i.test(html) };
				}
				results.push(result);
			} catch (e) { results.push({ url, error: e.message }); }
			if (results.length % 10 === 0) console.log(`  Inspected ${results.length}/${urls.length} URLs`);
		}
	}));
	return results.sort((a, b) => a.url.localeCompare(b.url));
}

function printRows(title, rows) {
	console.log(`\n${title} (clicks / impressions / CTR / average position)`);
	if (!rows.length) console.log('  No reported rows.');
	for (const r of rows) console.log(`  ${r.clicks} / ${r.impressions} / ${(r.ctr * 100).toFixed(2)}% / ${r.position.toFixed(1)}  ${r.keys?.join(' | ') ?? 'property'}`);
}

export async function main(args = process.argv.slice(2)) {
	const options = parseOptions(args);
	if (options.help) {
		console.log('Usage: pnpm search-console [days] [--targets] [--inspect] [--end YYYY-MM-DD] [--output file.json]');
		return;
	}
	const api = await googleClient();
	const collect = async (startDate, endDate, detailed) => {
		const base = { startDate, endDate };
		const dimensions = [[], ['date'], ['page'], ...(detailed ? [['query', 'page']] : [['query']])];
		const rows = await Promise.all(dimensions.map(d => fetchRows(api, { ...base, dimensions: d })));
		return { startDate, endDate, totals: rows[0][0] ?? null, dates: rows[1], pages: rows[2],
			queryPages: detailed ? rows[3] : [], queries: detailed ? [] : rows[3], latestReportedDate: rows[1].at(-1)?.keys[0] ?? null };
	};
	const detailed = Boolean(options.targets);
	const current = await collect(options.startDate, options.endDate, detailed);
	const previous = detailed ? await collect(options.previousStartDate, options.previousEndDate, true) : null;
	const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), site, searchType: 'web', dataState: 'final', timeZone: 'America/Los_Angeles', current, previous,
		caveats: ['Query rows may omit anonymized or truncated data; a missing row is unknown, not rank zero.',
			'Page and property totals use different aggregation. Do not sum page impressions into property impressions.',
			'Average position is not a guarantee of first-page or top-three placement for every search.',
			'A period with no reported rows cannot establish a before/after improvement.'] };
	report.sitemaps = (await api(`${property}/sitemaps`)).sitemap ?? [];
	console.log(`${site}: ${current.startDate} to ${current.endDate} (inclusive, finalized Web data, Pacific time)`);
	console.log(`Latest reported day: ${current.latestReportedDate ?? 'none'}`);
	printRows('Property total', current.totals ? [current.totals] : []);
	console.log('\nSitemaps');
	for (const s of report.sitemaps) console.log(`  ${s.path}: downloaded ${s.lastDownloaded ?? 'never'}, errors ${s.errors}, warnings ${s.warnings}`);
	if (detailed) {
		report.targets = targetResults(current, previous);
		console.log(`\nComparison window: ${previous.startDate} to ${previous.endDate}; latest reported day: ${previous.latestReportedDate ?? 'none'}`);
		for (const t of report.targets) {
			console.log(`\n${t.language} / ${t.topic}: ${t.page}`);
			for (const k of t.keywords) console.log(`  ${k.keyword}: ${k.current ? `${k.current.queries.length} matching queries, ${k.current.impressions} impressions, ${k.current.clicks} clicks, ${(k.current.ctr * 100).toFixed(2)}% CTR, position ${k.current.position.toFixed(1)}` : 'no reported matching query'}; previous position ${k.previous?.position.toFixed(1) ?? 'unknown'}`);
			printRows('Other observed queries on this page', t.observedQueries.filter(r => !t.keywords.some(k => k.current?.queries.includes(r.keys[0]))).sort((a, b) => b.impressions - a.impressions).slice(0, 20));
		}
	} else printRows('Top queries', current.queries.slice(0, 20));
	printRows('Top pages', current.pages.slice(0, 20));
	if (options.inspect) {
		report.inspections = await inspectSitemap(api);
		const groups = Map.groupBy(report.inspections, r => r.coverageState ?? 'Inspection error');
		console.log(`\nIndex status of ${report.inspections.length} sitemap URLs`);
		for (const [state, rows] of groups) {
			console.log(`  ${state}: ${rows.length}`);
			for (const r of rows) console.log(`    ${r.url.replace(origin, '')}${r.live ? ` HTTP ${r.live.status}, noindex=${r.live.noindex}, canonical=${r.live.canonical}` : ''}${r.error ? ` ERROR: ${r.error}` : ''}`);
		}
		if (report.inspections.some(r => r.error)) process.exitCode = 1;
	}
	console.log('\nInterpretation: ' + report.caveats.join(' '));
	if (options.output) { writeFileSync(options.output, JSON.stringify(report, null, 2) + '\n'); console.log(`Saved report: ${options.output}`); }
	return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	main().catch(e => { console.error(e.message); process.exitCode = 1; });
}
