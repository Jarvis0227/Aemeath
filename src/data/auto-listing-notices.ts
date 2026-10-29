/** 自动上架公告元信息，与同目录 notice.html 保持同步。 */
export type AutoListingNotice = {
	version: string;
	displayVersion: string;
	kicker: string;
	title: string;
	desc: string;
	brief: string;
	sections: Record<string, string>;
	labels: Record<string, string>;
};


export const autoListingNotices: AutoListingNotice[] = [];
