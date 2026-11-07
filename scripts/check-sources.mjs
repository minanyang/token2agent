// Fails when a page links to an external URL that is not listed in reference/sources.md.
// Usage: node scripts/check-sources.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const docs = 'src/content/docs';
const sourcesFile = join(docs, 'reference/sources.md');
const urlPattern = /\]\((https?:\/\/[^)\s]+)\)/g;

const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : /\.mdx?$/.test(name) ? [path] : [];
	});

const urls = (text) => [...text.matchAll(urlPattern)].map((m) => m[1]);
const listed = new Set(urls(readFileSync(sourcesFile, 'utf8')));

const missing = new Map();
for (const file of walk(docs)) {
	if (file === sourcesFile) continue;
	for (const url of urls(readFileSync(file, 'utf8'))) {
		if (!listed.has(url)) missing.set(url, [...(missing.get(url) ?? []), file]);
	}
}

for (const [url, files] of missing) console.log(`${url}\n  used in: ${[...new Set(files)].join(', ')}`);
console.log(`${missing.size} external URL(s) not in ${sourcesFile}`);
process.exit(missing.size ? 1 : 0);
