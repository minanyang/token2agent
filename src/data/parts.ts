// The roadmap's entry group and six parts, covering stages S0–S19. Used by the home roadmap and the stage page header.
import type { Lang } from '../i18n';

export type Part = { label: string; title: Record<Lang, string>; stages: number[]; optional?: boolean };

export const parts: Part[] = [
	{ label: '', title: { 'zh-TW': '從這裡開始', en: 'Start here' }, stages: [0] },
	{ label: 'Part I', title: { 'zh-TW': '模型原理', en: 'Models' }, stages: [1, 2, 3, 4, 5], optional: true },
	{ label: 'Part II', title: { 'zh-TW': '應用基礎', en: 'Applications' }, stages: [6, 7, 8] },
	{ label: 'Part III', title: { 'zh-TW': '知識與工具', en: 'Knowledge & Tools' }, stages: [9, 10, 11] },
	{ label: 'Part IV', title: { 'zh-TW': 'Agent 系統', en: 'Agents' }, stages: [12, 13, 14, 15] },
	{ label: 'Part V', title: { 'zh-TW': '產品上線', en: 'Production' }, stages: [16, 17, 18] },
	{ label: 'Part VI', title: { 'zh-TW': '綜合實戰', en: 'Capstone' }, stages: [19] },
];

export const stageCount = parts.reduce((n, p) => n + p.stages.length, 0);
