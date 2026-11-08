// The roadmap's parts and the stages (S0–S19) in each. Used by the home roadmap and the stage page header.
export type Part = { label: string; title: string; stages: number[]; optional?: boolean };

export const parts: Part[] = [
	{ label: 'Part I', title: '全貌', stages: [0] },
	{ label: 'Part II', title: '模型原理', stages: [1, 2, 3, 4, 5], optional: true },
	{ label: 'Part III', title: '應用基礎', stages: [6, 7, 8] },
	{ label: 'Part IV', title: '知識與行動', stages: [9, 10, 11] },
	{ label: 'Part V', title: 'Agent 系統', stages: [12, 13, 14, 15] },
	{ label: 'Part VI', title: '可信、產品、上線', stages: [16, 17, 18] },
	{ label: 'Part VII', title: '綜合實戰', stages: [19] },
];

export const stageCount = parts.reduce((n, p) => n + p.stages.length, 0);
