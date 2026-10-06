/**
 * FriendsMagicPortal 延迟加载包装器
 * 仅在用户交互时加载 Three.js 和相关逻辑
 */

let portalScriptLoaded = false;

export async function initFriendsMagicPortal(): Promise<void> {
	if (portalScriptLoaded) return;

	try {
		// 动态导入实际的 portal 脚本
		await import("./friends-magic-portal");
		portalScriptLoaded = true;
	} catch (error) {
		console.error("Failed to load Friends Magic Portal:", error);
	}
}

// 监听打开 portal 的事件
document.addEventListener("click", (event) => {
	const target = event.target as HTMLElement;
	const portalTrigger = target.closest("[data-open-friends-portal]");

	if (portalTrigger) {
		event.preventDefault();
		initFriendsMagicPortal().then(() => {
			// Portal 脚本加载后，重新触发点击
			portalTrigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
	}
});

// 如果已经在 /links 页面（routeMode），立即加载
if (document.querySelector('[data-friends-portal][data-friends-portal-route="true"]')) {
	// 延迟加载，避免阻塞初始渲染
	if (document.readyState === "complete") {
		setTimeout(initFriendsMagicPortal, 500);
	} else {
		window.addEventListener("load", () => {
			setTimeout(initFriendsMagicPortal, 500);
		});
	}
}
