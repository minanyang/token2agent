// Fails when a built page links to an internal page or #anchor that does not exist.
// Usage: pnpm build && node scripts/check-links.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : name.endsWith('.html') ? [path] : [];
	});

const pages = new Map();
for (const file of walk(dist)) {
	const html = readFileSync(file, 'utf8');
	const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decodeURIComponent(m[1])));
	const route = '/' + file.slice(dist.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '');
	pages.set(route, { html, ids });
}

let checked = 0;
const broken = [];
for (const [route, { html }] of pages) {
	for (const [, raw] of html.matchAll(/\shref="([^"]+)"/g)) {
		const href = raw.replaceAll('&amp;', '&');
		if (/^(https?:|mailto:|data:)/.test(href) || href.startsWith('//')) continue;
		const [path, hash] = href.split('#');
		const target = path === '' ? route : path.endsWith('/') ? path : path;
		if (/\.(xml|txt|svg|png|css|js|ico|webmanifest)$/.test(target)) {
			if (!existsSync(join(dist, target))) broken.push(`${route} -> ${href}`);
			continue;
		}
		const page = pages.get(target);
		checked++;
		if (!page) broken.push(`${route} -> ${href} (no page)`);
		else if (hash && !page.ids.has(decodeURIComponent(hash))) broken.push(`${route} -> ${href} (no anchor)`);
	}
}
for (const b of broken) console.log(b);
console.log(`${checked} internal links checked, ${broken.length} broken`);
process.exit(broken.length ? 1 : 0);
