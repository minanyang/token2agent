// Prints crawler / scanner traffic and Web Analytics (visits, Core Web Vitals) for token2agent.com.
// Uses the Cloudflare GraphQL Analytics API with Wrangler's credentials (`wrangler login` or CLOUDFLARE_API_TOKEN).
// Usage: node scripts/analytics.mjs [days]   (default 1; the Free plan keeps about 30 days)
import { execFileSync } from 'node:child_process';

const host = 'token2agent.com';
const days = Number(process.argv[2] ?? 1);
const since = new Date(Date.now() - days * 86_400_000).toISOString();

const token = execFileSync('npx', ['wrangler', 'auth', 'token'], { encoding: 'utf8' }).trim().split('\n').at(-1);
const api = async (path, init) => {
	const res = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
		...init,
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
	});
	const body = await res.json();
	if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
	return body;
};
const gql = async (fields) =>
	(await api('graphql', { method: 'POST', body: JSON.stringify({ query: `{ viewer ${fields} }` }) })).data.viewer;

const zone = (await api(`zones?name=${host}`)).result[0];
const { zones, accounts } = await gql(`{
	zones(filter: { zoneTag: "${zone.id}" }) {
		httpRequestsAdaptiveGroups(limit: 10000, filter: { datetime_geq: "${since}" }) {
			count
			dimensions { userAgent clientRequestPath edgeResponseStatus verifiedBotCategory }
		}
	}
	accounts(filter: { accountTag: "${zone.account.id}" }) {
		pages: rumPageloadEventsAdaptiveGroups(limit: 5000, filter: { datetime_geq: "${since}", requestHost: "${host}", bot: 0 }) {
			count
			sum { visits }
			dimensions { requestPath refererHost countryName deviceType }
		}
		vitals: rumWebVitalsEventsAdaptiveGroups(limit: 5000, filter: { datetime_geq: "${since}", requestHost: "${host}", bot: 0 }) {
			sum { lcpGood lcpNeedsImprovement lcpPoor inpGood inpNeedsImprovement inpPoor clsGood clsNeedsImprovement clsPoor }
			dimensions { requestPath deviceType cumulativeLayoutShiftElement }
		}
	}
}`);
const requests = zones[0].httpRequestsAdaptiveGroups;
const { pages, vitals } = accounts[0];

const tally = (rows, key, weight = (r) => r.count) => {
	const totals = new Map();
	for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + weight(row));
	return [...totals].sort((a, b) => b[1] - a[1]);
};
const print = (title, entries, limit = 10) => {
	console.log(`\n${title}`);
	for (const [label, n] of entries.slice(0, limit)) console.log(`  ${String(n).padStart(6)}  ${label || '(none)'}`);
};

// Request counts are sampled by Cloudflare, so treat them as proportions.
const scanPath = /\.env|\.git|\.svn|wp-|\.php|_environment|credentials|appsettings|\.aws|\.ssh|actuator/i;
const scans = requests.filter((r) => scanPath.test(r.dimensions.clientRequestPath));
const verified = requests.filter((r) => r.dimensions.verifiedBotCategory);

console.log(`${host}, since ${since}`);
console.log(`Requests: ${tally(requests, () => 'all')[0]?.[1] ?? 0} (sampled)`);
print('Verified bots by category', tally(verified, (r) => r.dimensions.verifiedBotCategory));
print(
	'Verified bots by user agent',
	tally(verified, (r) => r.dimensions.userAgent.slice(0, 100)),
);
print('Scanner paths', tally(scans, (r) => r.dimensions.clientRequestPath));
print('Scanner response codes', tally(scans, (r) => r.dimensions.edgeResponseStatus));
// A known crawler name without Cloudflare's verification is usually a scanner borrowing it.
const crawlerName = /claude|gptbot|chatgpt|oai-searchbot|perplexity|bytespider|ccbot|googlebot|bingbot|applebot/i;
print(
	'Unverified requests using a crawler name',
	tally(
		requests.filter((r) => !r.dimensions.verifiedBotCategory && crawlerName.test(r.dimensions.userAgent)),
		(r) => `${r.dimensions.edgeResponseStatus} ${r.dimensions.userAgent.slice(0, 90)}`,
	),
);

const visits = (r) => r.sum.visits;
console.log(`\nPage views: ${pages.reduce((n, r) => n + r.count, 0)}, visits: ${pages.reduce((n, r) => n + visits(r), 0)}`);
print('Page views by path', tally(pages, (r) => r.dimensions.requestPath), 15);
print('Visits by referrer', tally(pages, (r) => r.dimensions.refererHost, visits));
print('Visits by country', tally(pages, (r) => r.dimensions.countryName, visits));
print('Visits by device', tally(pages, (r) => r.dimensions.deviceType, visits));

console.log('\nCore Web Vitals (good / needs improvement / poor)');
for (const metric of ['lcp', 'inp', 'cls']) {
	const sum = (k) => vitals.reduce((n, r) => n + r.sum[metric + k], 0);
	console.log(`  ${metric.toUpperCase()}  ${sum('Good')} / ${sum('NeedsImprovement')} / ${sum('Poor')}`);
}
print(
	'Pages with poor CLS',
	tally(
		vitals.filter((r) => r.sum.clsPoor),
		(r) => `${r.dimensions.requestPath} (${r.dimensions.deviceType}) ${r.dimensions.cumulativeLayoutShiftElement}`,
		(r) => r.sum.clsPoor,
	),
);
