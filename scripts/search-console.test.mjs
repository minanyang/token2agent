import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, shiftDate, fetchRows, targetResults, targets, matchesKeyword } from './search-console.mjs';

test('report windows are inclusive, adjacent and use Pacific calendar dates', () => {
	const o = parseOptions(['28', '--targets'], new Date('2026-11-14T00:30:00Z'));
	assert.equal(o.endDate, '2026-11-10');
	assert.equal(o.startDate, '2026-10-14');
	assert.equal(o.previousEndDate, '2026-10-13');
	assert.equal(o.previousStartDate, '2026-09-16');
	assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
	const one = parseOptions(['1', '--end', '2026-11-11', '--output', '/tmp/gsc.json'], new Date('2026-11-14T12:00:00Z'));
	assert.equal(one.startDate, one.endDate);
	assert.equal(one.previousStartDate, '2026-11-10');
	assert.equal(one.output, '/tmp/gsc.json');
});

test('invalid input fails before credential access or API calls', () => {
	for (const args of [['0'], ['1.5'], ['366'], ['28', '7'], ['--end', '2026-02-30'], ['--end', '2030-01-01'], ['--unexpected']]) {
		assert.throws(() => parseOptions(args, new Date('2026-11-14T12:00:00Z')));
	}
});

test('pagination retains query-page attribution and only requests finalized Web data', async () => {
	const requests = [];
	const rows = await fetchRows(async (url, body) => {
		requests.push(body);
		return body.startRow === 0 ? { rows: [{ keys: ['rag', 'a'] }, { keys: ['rag', 'b'] }] } : { rows: [{ keys: ['evals', 'c'] }] };
	}, { startDate: '2026-11-01', endDate: '2026-11-07', dimensions: ['query', 'page'] }, 2);
	assert.deepEqual(rows.map(r => r.keys), [['rag', 'a'], ['rag', 'b'], ['evals', 'c']]);
	assert.deepEqual(requests.map(r => r.startRow), [0, 2]);
	assert.ok(requests.every(r => r.dataState === 'final' && r.type === 'web'));
});

test('missing or anonymized query rows remain unknown and do not inherit page totals', () => {
	const target = targets.find(t => t.topic === 'evals' && t.language === 'en');
	const metric = { clicks: 0, impressions: 32, ctr: 0, position: 11.1 };
	const current = { pages: [{ keys: [target.page], ...metric }], queryPages: [
		{ keys: ['LLM evaluation tutorial', target.page], ...metric, impressions: 2, position: 14 },
		{ keys: ['LLM judge calibration', target.page.replace('/en/', '/')], ...metric, position: 1 },
		{ keys: ['some other query', target.page], ...metric, impressions: 1 },
	] };
	const previous = { pages: [], queryPages: [] };
	const result = targetResults(current, previous).find(t => t.page === target.page);
	assert.equal(result.pageMetrics.impressions, 32);
	assert.equal(result.keywords[0].current.impressions, 2);
	assert.equal(result.keywords[0].previous, null);
	assert.equal(result.keywords[1].current, null);
	assert.equal(result.previousPageMetrics, null);
	assert.equal(result.observedQueries.length, 2);
	assert.equal(targetResults(previous, previous)[0].pageMetrics, null);
});

test('tracked phrases match long-tail variants by whole ASCII words and Chinese substrings', () => {
	assert.ok(matchesKeyword('how to implement reciprocal rank fusion rrf in python', 'RRF python'));
	assert.ok(matchesKeyword('ai 學習路線圖 2026', 'AI 學習路線'));
	assert.ok(!matchesKeyword('object storage pricing', 'rag'));
	assert.ok(!matchesKeyword('rrf explained', 'RRF python'));
});

test('matching queries are aggregated with impression-weighted position', () => {
	const target = targets.find(t => t.topic === 'rag' && t.language === 'en');
	const row = (query, impressions, position) => ({ keys: [query, target.page], clicks: 0, impressions, ctr: 0, position });
	const current = { pages: [], queryPages: [row('how to implement reciprocal rank fusion rrf in python', 11, 5.6), row('rrf python example', 1, 2), row('bm25 vs dense', 3, 9)] };
	const result = targetResults(current, { pages: [], queryPages: [] }).find(t => t.page === target.page);
	const rrf = result.keywords.find(k => k.keyword === 'RRF python').current;
	assert.equal(rrf.impressions, 12);
	assert.equal(rrf.queries.length, 2);
	assert.ok(Math.abs(rrf.position - (11 * 5.6 + 2) / 12) < 1e-9);
	assert.equal(result.keywords.find(k => k.keyword === 'Recall@k').current, null);
});
