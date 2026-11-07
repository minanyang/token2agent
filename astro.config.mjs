// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const stage = (n, slug) => ({ slug: `stages/s${String(n).padStart(2, '0')}-${slug}` });

// https://astro.build/config
export default defineConfig({
	site: 'https://token2agent.com',
	integrations: [
		starlight({
			title: 'Token2Agent：AI/LLM 學習路線',
			description: '從模型原理到 agent 系統、安全、上線與產品的完整學習路線與實作題目。',
			customCss: ['./src/styles/custom.css'],
			components: {
				// Adds the 淺顯 / 深入 reading-depth toggle next to the theme picker.
				ThemeSelect: './src/components/ThemeSelect.astro',
				Footer: './src/components/Footer.astro',
				SiteTitle: './src/components/SiteTitle.astro',
			},
			defaultLocale: 'root',
			locales: {
				// zh-TW is the root locale (no URL prefix). Add e.g. `en: { label: 'English' }` later.
				root: { label: '繁體中文', lang: 'zh-TW' },
			},
			sidebar: [
				{
					label: '開始',
					items: [
						{ slug: 'guide/how-to-use' },
						{ slug: 'guide/app-first' },
						{ slug: 'guide/math-refresher' },
					],
				},
				{ label: 'Part I 全貌', items: [stage(0, 'big-picture')] },
				{
					label: 'Part II 模型原理（選修）',
					items: [
						stage(1, 'neural-networks'),
						stage(2, 'transformer'),
						stage(3, 'pretraining'),
						stage(4, 'post-training'),
						stage(5, 'inference'),
					],
				},
				{
					label: 'Part III 應用基礎',
					items: [stage(6, 'llm-api'), stage(7, 'prompting'), stage(8, 'evals')],
				},
				{
					label: 'Part IV 知識與行動',
					items: [stage(9, 'rag'), stage(10, 'tools-mcp'), stage(11, 'context-engineering')],
				},
				{
					label: 'Part V Agent 系統',
					items: [
						stage(12, 'agent-harness'),
						stage(13, 'memory'),
						stage(14, 'agent-evals'),
						stage(15, 'multi-agent'),
					],
				},
				{
					label: 'Part VI 可信、產品、上線',
					items: [stage(16, 'security'), stage(17, 'ai-ux'), stage(18, 'deployment')],
				},
				{ label: 'Part VII 綜合實戰', items: [stage(19, 'capstone')] },
				{
					label: '實作線',
					items: [{ slug: 'projects/model-thread' }, { slug: 'projects/system-thread' }],
				},
				{ label: '社群', items: [{ slug: 'showcase' }] },
				{
					label: '參考',
					items: [
						{ slug: 'reference/sources' },
						{ slug: 'reference/glossary' },
						{ slug: 'reference/concepts' },
					],
				},
			],
		}),
	],
});
