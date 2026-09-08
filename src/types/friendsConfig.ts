// 友链配置
export type FriendLink = {
	title: string; // 友链标题
	imgurl: string; // 头像图片URL
	desc: string; // 友链描述
	siteurl: string; // 友链地址
	rss?: string | string[]; // RSS/Atom 地址，可留空并由朋友圈页面自动探测
	screenshot?: string; // 站点截图 URL（供后续友链展示或维护使用）
	tags?: string[]; // 标签数组
	recommended?: boolean; // 是否使用推荐友链样式
	recommendedTier?: "full" | "degraded"; // 推荐友链层级，降级推荐仅保留静态卡片装饰
	temporarilyUnavailable?: boolean; // 手动显示暂时失联状态
	weight: number; // 权重，数字越大排序越靠前
	enabled: boolean; // 是否启用
};

export type FriendsPageConfig = {
	title?: string; // 页面标题，留空则使用 i18n 中的翻译
	description?: string; // 页面描述，留空则使用 i18n 中的翻译
	showCustomContent?: boolean; // 是否显示自定义内容（friends.mdx）
	showComment?: boolean; // 是否显示评论区，默认 true
	randomizeSort?: boolean; // 是否打乱排序，如果为 true，将忽略 weight，随机排序
};
