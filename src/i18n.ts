// Locale helpers and UI strings for the custom components. Starlight's own UI strings are built in.
// zh-TW is the root locale (no URL prefix); English lives under /en/.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Lang = 'zh-TW' | 'en';

/** Maps Starlight's `starlightRoute.lang` to one of the site's languages. */
export const toLang = (lang: string): Lang => (lang === 'en' ? 'en' : 'zh-TW');

/** Prefixes a root-relative path (`/guide/how-to-use/`) with the locale's URL base. */
export const localizePath = (lang: Lang, path: string) => (lang === 'en' ? `/en${path}` : path);

/**
 * Stage entries (S0–S19) in the reader's language, sorted by number. Untranslated English pages fall back
 * to the zh-TW entry; their href still points under /en/, where Starlight serves the fallback page.
 */
export async function getStageEntries(lang: Lang) {
	const docs = await getCollection('docs');
	const byId = new Map(docs.map((e) => [e.id, e]));
	return docs
		.filter((e) => e.id.startsWith('stages/'))
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((root) => {
			const n = Number(root.id.match(/^stages\/s(\d+)-/)?.[1]);
			const entry: CollectionEntry<'docs'> = (lang === 'en' && byId.get(`en/${root.id}`)) || root;
			return { n, entry, href: localizePath(lang, `/${root.id}/`) };
		});
}

const zhTW = {
	siteName: 'Token2Agent：從 token 到 agent 的 AI/LLM 學習路線',
	license:
		'講義內容以 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant" rel="license noopener">CC BY-NC-SA 4.0</a> 授權：可以轉載與改作，但要標示出處、不得用於商業用途，改作也要用相同授權。引用的第三方內容與商標屬於原作者。',
	depthGroup: '閱讀模式',
	depthSimple: '淺顯',
	depthDeep: '深入',
	deepNotice: '這部分是選讀或進階內容。',
	deepExpand: '展開這一段',
	deepCollapse: '收起這一段',
	toDark: '切換成深色',
	toLight: '切換成淺色',
	optional: '（選修）',
	stageOf: (n: number, total: number) => `第 ${n} 章，共 ${total} 章`,
	heroRunLabel: '從使用者請求到回應的七步流程，含一次工具呼叫與結果回填',
	heroGoal: '整理上週的會議筆記',
	heroAnswer: '"3 項決議、2 項待辦"',
	heroFlowLabel: '課程章節',
	heroProgress: (last: number) => `課程章節：S0 到 S${last}`,
	runLog: [
		'system + user + notes_search',
		'', // Token IDs are generated from heroGoal in Hero.astro.
		'KV cache ready',
		'notes_search({query: "上週會議"})',
		'4 notes + excerpts',
		'messages += [tool_call, tool_result]',
		'串流 → 使用者 · trace ✓',
	],
	legendTopic: '主題',
	legendTopicNote: '點了會跳到該章的對應段落',
	legendModel: '模型專案（選做的實作題）',
	legendSystem: '系統專案（選做的實作題）',
	checkpoint: '安全檢查點',
	codesLink: 'S／A／M 代號怎麼讀',
	codesHref: '/guide/how-to-use/#代號怎麼讀',
	optionalTag: '選修・深入路線',
	optionalNote: '想懂模型怎麼運作再走；只做應用的人可以先跳過，從 S6 LLM API 與應用基本功繼續。',
	optionalSummary: (label: string, count: number, first: number, last: number) =>
		`${label} 的 ${count} 章（S${first}–S${last}），點開或切到深入模式就會顯示`,
	showcaseName: '專案分享',
	showcaseSub: '大家用 LLM 做出來的應用與 agent，任何人都可以開 PR 分享自己的專案',
	appRouteName: '應用路線（多數人從這裡走）',
	appRouteSub: 'S0 全局地圖 → 模型速成 → 直接跳到 S6 LLM API 與應用基本功；Part II 想深入再回來讀',
	showcaseEmpty: '還沒有專案。歡迎成為第一個分享的人，做法見下方。',
	showcaseUses: '用到：',
};

// Typed as zhTW so both languages always define the same keys.
const en: typeof zhTW = {
	siteName: 'Token2Agent: The AI/LLM Roadmap, from Tokens to Agents',
	license:
		'Lecture content is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en" rel="license noopener">CC BY-NC-SA 4.0</a>: you may share and adapt it with attribution, not for commercial use, and adaptations must use the same license. Quoted third-party content and trademarks belong to their owners.',
	depthGroup: 'Reading mode',
	depthSimple: 'Simple',
	depthDeep: 'Deep',
	deepNotice: 'This part is optional or advanced.',
	deepExpand: 'Show this section',
	deepCollapse: 'Hide this section',
	toDark: 'Switch to dark theme',
	toLight: 'Switch to light theme',
	optional: ' (optional)',
	stageOf: (n: number, total: number) => `Chapter ${n} of ${total}`,
	heroRunLabel: 'Seven steps from request to response, including a tool call and feedback',
	heroGoal: "summarize last week's meeting notes",
	heroAnswer: '"3 decisions, 2 action items"',
	heroFlowLabel: 'course chapters',
	heroProgress: (last: number) => `Course chapters: S0 to S${last}`,
	runLog: [
		'system + user + notes_search',
		'', // Token IDs are generated from heroGoal in Hero.astro.
		'KV cache ready',
		'notes_search({query: "last week"})',
		'4 notes + excerpts',
		'messages += [tool_call, tool_result]',
		'stream → user · trace ✓',
	],
	legendTopic: 'Topic',
	legendTopicNote: 'jumps to that section of the chapter',
	legendModel: 'Model project (optional exercises)',
	legendSystem: 'System project (optional exercises)',
	checkpoint: 'Security checkpoint',
	codesLink: 'How to read S/A/M codes',
	codesHref: '/en/guide/how-to-use/#how-to-read-the-codes',
	optionalTag: 'Optional · deep route',
	optionalNote: 'Take it when you want to know how models work; if you only build applications, skip ahead to S6 LLM APIs and Application Basics.',
	optionalSummary: (label: string, count: number, first: number, last: number) =>
		`The ${count} chapters of ${label} (S${first}–S${last}); open this or switch to Deep mode to show them`,
	showcaseName: 'Showcase',
	showcaseSub: 'Apps and agents people built with LLMs. Anyone can open a PR to share theirs.',
	appRouteName: 'Application route (where most people start)',
	appRouteSub: 'S0 The Big Picture → Model Crash Course → straight to S6 LLM APIs and Application Basics; come back to Part II when you want depth',
	showcaseEmpty: 'No projects yet. Be the first to share one; see how below.',
	showcaseUses: 'Uses:',
};

const ui = { 'zh-TW': zhTW, en } satisfies Record<Lang, typeof zhTW>;

/** UI strings for the current page. */
export const t = (lang: string) => ui[toLang(lang)];
