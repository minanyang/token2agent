// Requires a local dev server, ffmpeg, and an isolated headless Chrome with remote debugging.
// Example: node scripts/generate-media.mjs http://127.0.0.1:4322 http://127.0.0.1:9333
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const [site = 'http://127.0.0.1:4322', chrome = 'http://127.0.0.1:9333'] = process.argv.slice(2).filter(arg => arg !== '--og-only');
const ogOnly = process.argv.includes('--og-only');
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

try {
	for (const [locale, path] of [['zh', '/'], ['en', '/en/']]) {
		if (!ogOnly) {
			const page = await openPage(path);
			try {
				await page.evaluate(`(() => {
					const transitions = document.createElement('style');
					transitions.textContent = '*,*::before,*::after{transition:none!important}';
					document.head.append(transitions);
					const style = document.createElement('style');
					style.textContent = '*,*::before,*::after{animation:none!important}';
					document.head.append(style); void document.body.offsetHeight;
					style.remove(); void document.body.offsetHeight;
					window.mediaAnimations = document.getAnimations();
					window.mediaAnimations.forEach(a => { a.pause(); a.currentTime = 0; });
				})()`);
				for (const theme of ['light', 'dark']) {
					await page.evaluate(`document.documentElement.dataset.theme = '${theme}'`);
					const bounds = await page.evaluate(`(() => {
						const hero = document.querySelector('.t2a-hero').getBoundingClientRect();
						const terminal = document.querySelector('.run').getBoundingClientRect();
						return {x: Math.floor(hero.x) - 16, y: Math.floor(hero.y + scrollY),
							width: Math.ceil(Math.max(hero.right, terminal.right) - hero.x) + 32,
							height: Math.ceil(hero.height) + 16};
					})()`);
					const name = `hero-ids-fast${locale === 'en' ? '-en' : ''}-${theme}`;
					const frames = join(temporary, name);
					await mkdir(frames);
					// A complete first frame also works when animated images are shown statically.
					const times = [20000, ...Array.from({ length: 81 }, (_, i) => i * 100)];
					for (const [index, time] of times.entries()) {
						await page.evaluate(`window.mediaAnimations.forEach(a => a.currentTime = ${time})`);
						await writeFile(join(frames, `${String(index).padStart(3, '0')}.png`), await page.screenshot(bounds));
					}
					const output = new URL(`.github/assets/${name}.gif`, root).pathname;
					await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '10', '-i',
						join(frames, '%03d.png'), '-filter_complex',
						'[0:v]scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
						'-loop', '0', output]);
					// Keep representative frames for visual verification during this run.
					for (const index of [0, 4, 31]) await sharp(output, { page: index }).png()
						.toFile(join(temporary, `${name}-${index}.png`));
					console.log(`Generated ${name}.gif`);
				}
			} finally { await page.close(); }
		}

		const og = await openPage(path);
		try {
			await og.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
			await og.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
			await og.evaluate(`(() => {
				document.documentElement.dataset.theme = 'dark';
				const hero = document.querySelector('.t2a-hero');
				hero.querySelector('.actions').remove();
				hero.querySelector('.tagline-rest').remove();
				const topics = document.createElement('p'); topics.className = 'social-topics';
				topics.textContent = '${locale === 'en' ? 'Free' : '免費'} · LLM API · RAG · MCP · Eval · Guardrails';
				hero.querySelector('.copy').append(topics);
				document.body.replaceChildren(hero);
				const brand = document.createElement('div'); brand.className = 'social-brand';
				const icon = document.createElement('img'); icon.src = '/favicon.svg';
				brand.append(icon, document.createTextNode('token2agent.com')); document.body.append(brand);
				const style = document.createElement('style');
				style.textContent = \`
					html, body { margin:0!important; width:1200px; height:630px; overflow:hidden; }
					*,*::before,*::after { animation:none!important; transition:none!important; }
					.social-brand { position:absolute; left:60px; top:64px; display:flex; align-items:center; gap:12px;
						color:#a5a6a8; font:18px var(--__sl-font-mono); }
					.social-brand img { width:32px; height:32px; }
					.t2a-hero { position:absolute; left:60px; top:158px; width:1080px; height:360px;
						padding:0!important; display:grid; grid-template-columns:560px 470px; gap:50px; align-items:center; }
					.copy { gap:24px; }
					.copy h1 { font-size:64px!important; }
					.copy .tagline { font-size:19px!important; line-height:1.9; }
					.social-topics { margin:0; color:#a5a6a8; font:15px var(--__sl-font-mono); white-space:nowrap; }
					.run { font-size:14px!important; line-height:1.65; }
					.run .prompt { font-size:12px; }
					.run figcaption { font-size:11px; }
					.run li { grid-template-columns:64px minmax(0,1fr); gap:12px; }
					.run .progress-label { font-size:11px; }
				\`;
				document.head.append(style);
			})()`);
			await og.evaluate(`Promise.all([document.fonts.ready, ...[...document.images].map(img => img.decode())])`);
			const output = new URL(`public/og${locale === 'en' ? '-en' : ''}.png`, root).pathname;
			await writeFile(output, await og.screenshot());
			console.log(`Generated ${output}`);
		} finally { await og.close(); }
	}
	console.log(`Visual QA frames: ${temporary}`);
} catch (error) {
	await rm(temporary, { recursive: true, force: true });
	throw error;
}
