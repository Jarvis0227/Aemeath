import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COMMENT_AVATAR, getCommentAvatarUrl } from "./comment-avatars";

test("missing provider avatars request a real 404 for the local fallback", () => {
	const url = new URL(
		getCommentAvatarUrl(
			"https://seccdn.libravatar.org/avatar/example?s=80&default=mp&f=y",
		),
	);
	assert.equal(url.searchParams.get("d"), "404");
	assert.equal(url.searchParams.get("s"), "80");
	assert.equal(url.searchParams.has("default"), false);
	assert.equal(url.searchParams.has("f"), false);
});

test("custom avatars and local Xiaoai artwork keep their original source", () => {
	for (const source of [
		"https://q1.qlogo.cn/g?b=qq&nk=12345&s=100",
		"https://example.com/avatar.png",
		"/favicon/chaoc-tingyu-avatar-512.png?v=20260907",
	])
		assert.equal(getCommentAvatarUrl(source), source);
});

test("empty or unsafe avatar sources use the pig avatar", () => {
	for (const source of [undefined, "", "javascript:alert(1)"])
		assert.equal(getCommentAvatarUrl(source), DEFAULT_COMMENT_AVATAR);
});

test("provider matching does not rewrite unrelated hostnames", () => {
	const source = "https://notlibravatar.org/avatar/custom.png";
	assert.equal(getCommentAvatarUrl(source), source);
});
