import test from 'node:test';
import assert from 'node:assert/strict';
import {
	agentClass,
	crawlPattern,
	crawlerName,
	isOutdated,
	latestVersions,
	selfTriggered,
	sitemapLocs,
	sourceClass,
	truncatedQueries,
} from './analytics.mjs';

const iphone13 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const android131 = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const chrome156 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const safari26 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15';

test('browser versions more than about a year behind the newest seen are outdated', () => {
	const latest = latestVersions([iphone13, android131, chrome156, safari26]);
	assert.deepEqual(latest, { chrome: 156, firefox: 0, safari: 26 });
	assert.equal(isOutdated(iphone13, latest), true);
	assert.equal(isOutdated(android131, latest), true);
	assert.equal(isOutdated(chrome156, latest), false);
	assert.equal(isOutdated(safari26, latest), false);
	assert.equal(agentClass(iphone13, latest), 'browser-like, outdated version');
	assert.equal(agentClass(chrome156, latest), 'browser-like, current version');
	assert.equal(agentClass('curl/8.7.1', latest), 'tool or headless');
	assert.equal(agentClass('Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', latest), 'crawler name, unverified');
});

test('crawler names come from the user agent, including names inside parentheses', () => {
	assert.equal(crawlerName('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'), 'AhrefsBot');
	assert.equal(crawlerName('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'), 'ClaudeBot');
	assert.equal(crawlerName('Mozilla/5.0 (compatible; Cloudflare-AgentReadiness/1.0)'), 'Cloudflare-AgentReadiness');
	assert.equal(crawlerName('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'), 'facebookexternalhit');
	assert.ok(selfTriggered.test('Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)'));
	assert.ok(!selfTriggered.test('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'));
});

test('crawl pattern separates on-demand fetchers from crawls', () => {
	assert.equal(crawlPattern({ category: 'AI Assistant', pages: 40, robots: 3 }), 'on demand');
	assert.equal(crawlPattern({ category: 'Page Preview', pages: 1, robots: 0 }), 'on demand');
	assert.equal(crawlPattern({ category: 'AI Search', pages: 2, robots: 1 }), 'crawl');
	assert.equal(crawlPattern({ category: 'AI Crawler', pages: 10, robots: 0 }), 'crawl');
	assert.equal(crawlPattern({ category: 'AI Crawler', pages: 3, robots: 0 }), 'occasional');
});

test('referrers are grouped by source type', () => {
	assert.equal(sourceClass(''), 'direct / none');
	assert.equal(sourceClass('token2agent.com'), 'internal');
	assert.equal(sourceClass('chatgpt.com'), 'AI assistant');
	assert.equal(sourceClass('www.google.com'), 'search engine');
	assert.equal(sourceClass('l.threads.com'), 'social');
	assert.equal(sourceClass('github.com'), 'code hosting');
});

test('sitemap locations are read and unescaped', () => {
	const xml = '<urlset><url><loc>https://token2agent.com/</loc></url><url><loc>https://token2agent.com/a?b=1&amp;c=2</loc></url></urlset>';
	assert.deepEqual(sitemapLocs(xml), ['https://token2agent.com/', 'https://token2agent.com/a?b=1&c=2']);
});

test('a query that fills its limit is reported as cut off', () => {
	const results = { full: [1, 2, 3], partial: [1], single: [1] };
	assert.deepEqual(truncatedQueries(results, { full: 3, partial: 3, single: 1 }), ['full']);
});
