export const DEFAULT_COMMENT_AVATAR = "/assets/comment-default-pig.webp";
export const COMMENT_AVATAR_PROVIDERS = [
	"gravatar.com",
	"libravatar.org",
] as const;

export const getCommentAvatarUrl = (value: unknown): string => {
	if (typeof value !== "string" || !value.trim()) return DEFAULT_COMMENT_AVATAR;
	try {
		const url = new URL(value, "https://example.com");
		if (!["http:", "https:"].includes(url.protocol))
			return DEFAULT_COMMENT_AVATAR;
		if (
			COMMENT_AVATAR_PROVIDERS.some(
				(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
			)
		) {
			// Missing provider avatars should use our local fallback instead of its logo.
			url.searchParams.delete("default");
			url.searchParams.delete("f");
			url.searchParams.delete("forcedefault");
			url.searchParams.set("d", "404");
			return url.href;
		}
		return value;
	} catch {
		return DEFAULT_COMMENT_AVATAR;
	}
};
