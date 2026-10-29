import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	title: "欢迎使用 Aemeath",
	content: "请先填写 src/config 中的站点配置，再添加自己的文章和数据。",
	closable: true,
	links: [{ enable: true, text: "配置说明", url: "https://github.com/Jarvis0227/Aemeath#内容与配置", external: true }],
};
