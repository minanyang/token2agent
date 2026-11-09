// Generates hero GIFs, roadmap GIFs and OG cards from a built site served locally.
// Requires ffmpeg and an isolated headless Chrome with remote debugging.
// Hero GIFs and OG cards share the same composition; only the GIFs animate.
// Example: node scripts/generate-media.mjs http://127.0.0.1:4322 http://127.0.0.1:9333
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const [site = 'http://127.0.0.1:4322', chrome = 'http://127.0.0.1:9333'] = process.argv.slice(2).filter(arg => !['--og-only', '--social-only'].includes(arg));
const ogOnly = process.argv.includes('--og-only');
const socialOnly = process.argv.includes('--social-only');
const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), 'token2agent-media-'));
const root = new URL('../', import.meta.url);

async function openPage(path) {
	const target = await (await fetch(`${chrome}/json/new?about:blank`, { method: 'PUT' })).json();
	const socket = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
	let id = 0;
	const pending = new Map();
	socket.onmessage = ({ data }) => {
		const message = JSON.parse(data);
		if (!message.id) return;
		const request = pending.get(message.id);
		pending.delete(message.id);
		message.error ? request.reject(message.error) : request.resolve(message.result);
	};
	const send = (method, params = {}) => new Promise((resolve, reject) => {
		pending.set(++id, { resolve, reject });
		socket.send(JSON.stringify({ id, method, params }));
	});
	const evaluate = async (expression) => {
		const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
		if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
		return result.result.value;
	};
	await send('Page.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
	await send('Page.navigate', { url: site + path });
	let ready = false;
	for (let attempt = 0; attempt < 200 && !ready; attempt++) {
		try { ready = await evaluate(`!!document.querySelector('.t2a-hero')`); }
		catch (error) { if (!JSON.stringify(error).includes('context')) throw error; }
		if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
	}
	if (!ready) throw new Error(`Hero did not load: ${site + path}`);
	await evaluate('document.fonts.ready');
	await evaluate(`document.querySelector('astro-dev-toolbar')?.remove()`);
	return {
		send, evaluate,
		close: async () => { socket.close(); await fetch(`${chrome}/json/close/${target.id}`); },
		screenshot: async (clip) => Buffer.from((await send('Page.captureScreenshot', {
			format: 'png', captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
		})).data, 'base64'),
	};
}

async function prepareSocialCard(page, locale, theme) {
	await page.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
	await page.evaluate(`(() => {
		document.documentElement.dataset.theme = ${JSON.stringify(theme)};
		const hero = document.querySelector('.t2a-hero');
		hero.querySelector('.actions')?.remove();
		const topics = document.createElement('p'); topics.className = 'social-topics';
		const chapterCount = hero.querySelectorAll('.progress .blk').length;
		topics.textContent = chapterCount + ${JSON.stringify(`${locale === 'en' ? ' chapters · Free' : ' 章 · 免費'} · LLM API · RAG · MCP · Evals · Guardrails`)};
		hero.querySelector('.copy').append(topics);
		document.body.replaceChildren(hero);
		const brand = document.createElement('div'); brand.className = 'social-brand';
		const icon = document.createElement('img'); icon.src = '/favicon.svg';
		brand.append(icon, document.createTextNode('token2agent.com')); document.body.append(brand);
		const style = document.createElement('style');
		style.textContent = \`
			html, body { margin:0!important; width:1200px; height:630px; overflow:hidden; }
			*,*::before,*::after { transition:none!important; }
			.social-brand { position:absolute; left:48px; top:42px; display:flex; align-items:center; gap:12px;
				color:var(--sl-color-gray-2); font:18px var(--__sl-font-mono); }
			.social-brand img { width:32px; height:32px; }
			.t2a-hero { position:absolute; left:48px; top:142px; width:1104px; height:420px;
				padding:0!important; display:grid; grid-template-columns:560px 516px; gap:28px; align-items:start; }
			.copy { gap:26px; }
			.copy h1 { font-size:74px!important; }
			.copy .tagline { font-size:22px!important; line-height:1.9; }
			.copy .tagline-rest { font-size:20px; line-height:1.6; max-width:27em; }
			.social-topics { margin:0; color:var(--sl-color-gray-2); font:15px var(--__sl-font-mono); white-space:nowrap; }
			.run { font-size:16.5px!important; line-height:1.65; }
			.run .prompt { font-size:12.5px; }
			.run figcaption { font-size:11px; }
			.run li { grid-template-columns:80px minmax(0,1fr); gap:12px; white-space:normal; }
			.run .text { min-width:0; overflow-wrap:anywhere; }
			.run .progress-label { font-size:11px; }
		\`;
		document.head.append(style);
	})()`);
	await page.evaluate('Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode())])');
	await assertSocialCardFits(page);
}

async function assertSocialCardFits(page) {
	const errors = await page.evaluate(`(() => {
		const errors = [];
		// Include both decode states: the tool call can be wider than the final answer.
		for (const el of document.querySelectorAll('.run .text, .decode-output > span, .run .prompt, .social-topics')) {
			if (el.scrollWidth > el.clientWidth + 1) errors.push('Horizontal overflow: ' + el.textContent.trim());
		}
		for (const el of document.querySelectorAll('.copy, .run, .social-brand')) {
			const r = el.getBoundingClientRect();
			if (r.left < 0 || r.top < 0 || r.right > 1201 || r.bottom > 631) errors.push('Outside card: ' + el.className);
		}
		return errors;
	})()`);
	if (errors.length) throw new Error(errors.join('\n'));
}

async function encodeGif(frames, output) {
	await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '10', '-i',
		join(frames, '%03d.png'), '-filter_complex',
		'[0:v]scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
		'-loop', '0', output]);
}

async function heroGif(page, name) {
	const duration = await page.evaluate(`(() => {
		window.mediaAnimations = document.getAnimations();
		window.mediaAnimations.forEach(a => a.pause());
		return Math.max(...window.mediaAnimations.map(a => a.effect.getComputedTiming().endTime).filter(Number.isFinite));
	})()`);
	if (!(duration > 0)) throw new Error('No hero animation found');
	const frames = join(temporary, name);
	await mkdir(frames);
	// A complete first frame also works when animated images are shown statically.
	const times = [duration + 1000, ...Array.from({ length: Math.ceil(duration / 100) + 6 }, (_, i) => i * 100)];
	for (const [index, time] of times.entries()) {
		await page.evaluate(`window.mediaAnimations.forEach(a => a.currentTime = ${time})`);
		await writeFile(join(frames, `${String(index).padStart(3, '0')}.png`), await page.screenshot());
	}
	const output = new URL(`.github/assets/${name}.gif`, root).pathname;
	await encodeGif(frames, output);
	for (const index of [0, 12, 31]) await sharp(output, { page: index }).png()
		.toFile(join(temporary, `${name}-${index}.png`));
	console.log(`Generated ${name}.gif (${times.length} frames, no actions)`);
}

async function roadmapGif(path, locale, theme) {
	const page = await openPage(path);
	try {
		await page.evaluate(`(() => {
			document.documentElement.dataset.theme = ${JSON.stringify(theme)};
			document.documentElement.dataset.depth = 'deep';
			document.querySelectorAll('details.deep').forEach(d => d.open = true);
			const style = document.createElement('style');
			style.textContent = 'astro-dev-toolbar{display:none!important} body{background-image:none!important} .roadmap{padding:16px;margin:0!important;background:var(--sl-color-bg)} .roadmap .part-body > summary{display:none!important}';
			document.head.append(style);
			window.mediaAnimations = document.getAnimations().filter(a => a.animationName === 'token-flow');
			window.mediaAnimations.forEach(a => a.pause());
		})()`);
		const duration = await page.evaluate('window.mediaAnimations[0]?.effect.getTiming().duration');
		if (!(duration > 0)) throw new Error('No roadmap flow animation found');
		const bounds = await page.evaluate(`(() => {
			const r = document.querySelector('.roadmap').getBoundingClientRect();
			return {x:Math.floor(r.x + scrollX), y:Math.floor(r.y + scrollY), width:Math.ceil(r.width), height:Math.ceil(r.height)};
		})()`);
		const name = `roadmap${locale === 'en' ? '-en' : ''}-${theme}`;
		const frames = join(temporary, name);
		await mkdir(frames);
		const count = Math.round(duration / 100);
		for (let index = 0; index < count; index++) {
			await page.evaluate(`window.mediaAnimations.forEach(a => a.currentTime = ${index * duration / count})`);
			await writeFile(join(frames, `${String(index).padStart(3, '0')}.png`), await page.screenshot(bounds));
		}
		const output = new URL(`.github/assets/${name}.gif`, root).pathname;
		await encodeGif(frames, output);
		await sharp(output).png().toFile(join(temporary, `${name}-0.png`));
		console.log(`Generated ${name}.gif (${count} frames)`);
	} finally { await page.close(); }
}

try {
	for (const [locale, path] of [['zh', '/'], ['en', '/en/']]) {
		for (const theme of ogOnly ? ['dark'] : ['light', 'dark']) {
			const page = await openPage(path);
			try {
				await prepareSocialCard(page, locale, theme);
				if (!ogOnly) await heroGif(page, `hero-ids-fast${locale === 'en' ? '-en' : ''}-${theme}`);
				if (theme === 'dark') {
					await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
					await page.evaluate(`(() => {
						const style = document.createElement('style');
						style.textContent = '*,*::before,*::after{animation:none!important}';
						document.head.append(style);
					})()`);
					const output = new URL(`public/og${locale === 'en' ? '-en' : ''}.png`, root).pathname;
					await writeFile(output, await page.screenshot());
					console.log(`Generated ${output}`);
				}
			} finally { await page.close(); }
		}
		if (!ogOnly && !socialOnly) for (const theme of ['light', 'dark']) await roadmapGif(path, locale, theme);
	}
	console.log(`Visual QA frames: ${temporary}`);
} catch (error) {
	await rm(temporary, { recursive: true, force: true });
	throw error;
}
