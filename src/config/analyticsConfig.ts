import type { AnalyticsConfig } from "../types/analyticsConfig";

export const analyticsConfig: AnalyticsConfig = {
	// Add your own analytics IDs and URLs here when you deploy the site.
	googleAnalyticsId: "",
	microsoftClarityId: "",
	umamiAnalytics: {
		websiteId: "",
		scriptUrl: "",
		hostUrl: "",
		shareId: "",
		shareApiBase: "",
		historicalStats: {
			visitors: 0,
			pageviews: 0,
		},
		showPageViews: false,
		showSiteStats: false,
		replaysScriptUrl: "",
		trackOutboundLinks: false,
		collectWebVitals: false,
		replays: {
			enabled: false,
			sampleRate: 0,
			maskLevel: "strict",
			maxDuration: 0,
			blockSelector: "",
		},
	},
	la51Analytics: {
		Id: "",
		sdkUrl: "",
		ck: "",
		autoTrack: false,
		hashMode: false,
		screenRecord: false,
	},
};