/** 颜色表达更新性质与影响程度，按每条记录的主要变化人工标注。 */
export type BlogChangelogTone =
	| "major"
	| "feature"
	| "minor"
	| "fix"
	| "content";

export type BlogChangelogEntry = {
	date: string;
	version: string;
	displayDate: string;
	kind: string;
	title: string;
	summary: string;
	details: string[];
	tags: string[];
	tone: BlogChangelogTone;
};

/**
 * 博客本身的建设记录。
 * 自动上架工具公告留在 /changelog/，这里仅记录本站站点的页面、内容、社区和部署变化。
 */
export const blogChangelogEntries: BlogChangelogEntry[] = [];
