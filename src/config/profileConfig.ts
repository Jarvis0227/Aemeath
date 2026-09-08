import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "assets/images/rain-avatar.webp",

	// 名字
	name: "Rain",

	// 个人签名
	bio: "Hello, I'm Rain.",

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/Jarvis0227",
			showName: false,
		},
		{
			name: "Bilibili",
			icon: "simple-icons:bilibili",
			url: "https://space.bilibili.com/473321504?spm_id_from=333.1007.0.0",
			showName: false,
		},
		{
			name: "微信",
			icon: "fa7-brands:weixin",
			url: "copy:19065346944",
			showName: false,
		},
		{
			name: "Email",
			icon: "fa7-solid:envelope",
			url: "copy:1953549196@qq.com",
			showName: false,
		},
	],
};
