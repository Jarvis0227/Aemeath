export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
	icon?: string; // 菜单项图标
	iconImage?: string; // 外部链接使用的图片图标
	children?: NavBarLink[]; // 支持子菜单
	activePaths?: string[]; // 自定义活动路径，用于将额外路由归入当前导航项
	pageKey?: string;
};

export enum NavBarSearchMethod {
	PageFind = 0,
}

export type NavBarSearchConfig = {
	method: NavBarSearchMethod;
};

export type NavBarConfig = {
	links: NavBarLink[];
};
