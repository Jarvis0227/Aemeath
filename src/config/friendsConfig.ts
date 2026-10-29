import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

export const friendsPageConfig: FriendsPageConfig = {
	title: "友链",
	description: "请在 src/config/friendsConfig.ts 中添加自己的友链",
	showCustomContent: true,
	showComment: true,
	randomizeSort: false,
};

export const friendsProjects: FriendLink[] = [];
export const friendsConfig: FriendLink[] = [];

export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);
	return friendsPageConfig.randomizeSort
		? friends.sort(() => Math.random() - 0.5)
		: friends.sort((a, b) => b.weight - a.weight);
};
