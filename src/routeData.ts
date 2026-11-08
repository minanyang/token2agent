// Adjusts Starlight's hreflang alternates for search engines:
// - x-default points to the English page, so searchers in languages other than Chinese and English get English.
// - hreflang="zh" points to the zh-TW page, so Simplified Chinese searchers get Traditional Chinese, not English.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware((context) => {
	const { head } = context.locals.starlightRoute;
	const alternate = (hreflang: string) =>
		head.find((e) => e.tag === 'link' && e.attrs?.rel === 'alternate' && e.attrs.hreflang === hreflang);

	const en = alternate('en');
	const zhTW = alternate('zh-TW');
	const xDefault = alternate('x-default');
	if (!en?.attrs || !zhTW?.attrs || !xDefault?.attrs) return;

	xDefault.attrs.href = en.attrs.href;
	head.splice(head.indexOf(zhTW) + 1, 0, { tag: 'link', attrs: { rel: 'alternate', hreflang: 'zh', href: zhTW.attrs.href } });
});
