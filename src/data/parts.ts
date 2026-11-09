// The roadmap's parts and the stages (S0–S19) in each. Used by the home roadmap and the stage page header.
import type { Lang } from '../i18n';

export type Part = { label: string; title: Record<Lang, string>; stages: number[]; optional?: boolean };

export const parts: Part[] = [
	{ label: 'Part I', title: { 'zh-TW': '全貌', en: 'The Big Picture' }, stages: [0] },
	{ label: 'Part II', title: { 'zh-TW': '模型原理', en: 'How Models Work' }, stages: [1, 2, 3, 4, 5], optional: true },
	{ label: 'Part III', title: { 'zh-TW': '應用基礎', en: 'Application Foundations' }, stages: [6, 7, 8] },
	{ label: 'Part IV', title: { 'zh-TW': '知識與行動', en: 'Knowledge and Action' }, stages: [9, 10, 11] },
	{ label: 'Part V', title: { 'zh-TW': 'Agent 系統', en: 'Agent Systems' }, stages: [12, 13, 14, 15] },
	{ label: 'Part VI', title: { 'zh-TW': '可信、產品、上線', en: 'Trust, Product, Shipping' }, stages: [16, 17, 18] },
	{ label: 'Part VII', title: { 'zh-TW': '綜合實戰', en: 'Capstone' }, stages: [19] },
];

export const stageCount = parts.reduce((n, p) => n + p.stages.length, 0);
