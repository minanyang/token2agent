// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const stage = (n, slug) => ({ slug: `stages/s${String(n).padStart(2, '0')}-${slug}` });

// https://astro.build/config
export default defineConfig({
	site: 'https://token2agent.com',
	integrations: [
		starlight({
			title: { 'zh-TW': 'Token2Agent：AI/LLM 學習路線', en: 'Token2Agent: The AI/LLM Roadmap' },
			description: '學會做出能上線的 AI 應用與 agent：從 LLM API、RAG、MCP 工具到評估與安全，每個概念都用實際例子講清楚。免費，不需要背景知識。',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/minanyang/token2agent' }],
			head: [
				{ tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
					},
				},
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
			],
			customCss: ['./src/styles/custom.css'],
			// x-default → English, hreflang="zh" → zh-TW (see the file).
			routeMiddleware: './src/routeData.ts',
			components: {
				// Adds the 淺顯 / 深入 reading-depth toggle next to the theme picker.
				ThemeSelect: './src/components/ThemeSelect.astro',
				Footer: './src/components/Footer.astro',
				// Remembers an explicit language choice for the redirect in worker/index.ts.
				LanguageSelect: './src/components/LanguageSelect.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				Head: './src/components/Head.astro',
				// Home hero: title and tagline as tokens, next to an agent run log.
				Hero: './src/components/Hero.astro',
				// Stage pages: step line and progress strip above the title.
				PageTitle: './src/components/PageTitle.astro',
			},
			defaultLocale: 'root',
			locales: {
				// zh-TW is the root locale (no URL prefix). Untranslated English pages fall back to zh-TW.
				root: { label: '繁體中文', lang: 'zh-TW' },
				en: { label: 'English', lang: 'en' },
			},
			sidebar: [
				{
					label: '從這裡開始',
					translations: { en: 'Start here' },
					items: [
						stage(0, 'big-picture'),
						{ slug: 'guide/how-to-use' },
						{ slug: 'guide/app-first' },
						{ slug: 'guide/math-refresher' },
					],
				},
				{
					label: 'Part I 模型原理',
					translations: { en: 'Part I Models' },
					items: [
						stage(1, 'neural-networks'),
						stage(2, 'transformer'),
						stage(3, 'pretraining'),
						stage(4, 'post-training'),
						stage(5, 'inference'),
					],
				},
				{
					label: 'Part II 應用基礎',
					translations: { en: 'Part II Applications' },
					items: [stage(6, 'llm-api'), stage(7, 'prompting'), stage(8, 'evals')],
				},
				{
					label: 'Part III 知識與工具',
					translations: { en: 'Part III Knowledge & Tools' },
					items: [stage(9, 'rag'), stage(10, 'tools-mcp'), stage(11, 'context-engineering')],
				},
				{
					label: 'Part IV Agent 系統',
					translations: { en: 'Part IV Agents' },
					items: [
						stage(12, 'agent-harness'),
						stage(13, 'memory'),
						stage(14, 'agent-evals'),
						stage(15, 'multi-agent'),
					],
				},
				{
					label: 'Part V 產品上線',
					translations: { en: 'Part V Production' },
					items: [stage(16, 'security'), stage(17, 'ai-ux'), stage(18, 'deployment')],
				},
				{ label: 'Part VI 綜合實戰', translations: { en: 'Part VI Capstone' }, items: [stage(19, 'capstone')] },
				{
					label: '實作專案',
					translations: { en: 'Hands-on projects' },
					items: [{ slug: 'projects/model-thread' }, { slug: 'projects/system-thread' }],
				},
				{ label: '社群', translations: { en: 'Community' }, items: [{ slug: 'showcase' }] },
				{
					label: '參考',
					translations: { en: 'Reference' },
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
