import type { AnalyticsConfig } from "../types/analyticsConfig";

export const analyticsConfig: AnalyticsConfig = {
	// Google Analytics ID
	googleAnalyticsId: "",
	// Microsoft Clarity ID
	microsoftClarityId: "",
	// Umami 统计配置
	umamiAnalytics: {
		// Umami Website ID
		websiteId: "e76c6069-3117-42a1-8508-d374b2175108",
		// Umami JS地址，支持使用自建
		scriptUrl: "https://cloud.umami.is/script.js",
		// 在 Umami 后台创建公开分享链接后填写。仅用于读取公开统计，不要填写管理员 Token。
		// Umami Cloud 公开分享链接的 slug，仅供前端读取公开统计。
		shareId: "T1uusJRzfxbuxBLK",
		// Umami Cloud 使用 https://cloud.umami.is；自建 Umami 则改成你的实例地址。
		shareApiBase: "https://cloud.umami.is/analytics/us",
		// 迁移前的历史累计仅合并展示在站点统计卡片中，不会写入 Umami。
		historicalStats: {
			visitors: 590,
			pageviews: 921,
		},
		// 文章页保留 Waline 的历史阅读量；Umami 继续负责全站流量与仪表盘统计。
		showPageViews: false,
		// 在“站点统计”卡片中显示累计访客与总浏览量。
		showSiteStats: true,
		// Umami 会话回放脚本地址，支持使用自建
		replaysScriptUrl: "https://umami.rainzt.cn/recorder.js",
		// 是否追踪出站链接
		trackOutboundLinks: true,
		// 是否收集浏览器性能指标
		collectWebVitals: false,
		// 会话回放配置
		replays: {
			// 是否启用会话回放
			enabled: false,
			// 录制会话采样率，范围 0-1，例如 0.15 表示记录 15% 的会话
			sampleRate: 0.15,
			// 隐私遮罩级别："moderate" 会遮罩所有输入框；"strict" 额外遮罩页面全部文本
			maskLevel: "moderate",
			// 单次录制最大时长（毫秒）
			maxDuration: 300000,
			// 需要排除录制的元素 CSS 选择器，例如 ".sensitive-widget"
			blockSelector: "",
		},
	},
	// 51la 统计配置
	la51Analytics: {
		// 51la 统计 ID
		Id: "",
		// 自定义 SDK JS 地址，防止 DNS 污染，留空使用默认地址
		sdkUrl: "",
		// 多个统计 ID 的数据分离标识，留空则使用 Id
		ck: "",
		// 是否开启事件分析功能
		autoTrack: false,
		//  Hash路由模式, 项目使用History API路由, 所以不必开启默认false
		hashMode: false,
		// 是否开启网站录屏功能
		screenRecord: true,
	},
};
