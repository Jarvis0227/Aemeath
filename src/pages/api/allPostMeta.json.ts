import * as path from "node:path";
import { getSortedPosts } from "@/utils/content-utils";
import { processCoverImageSync } from "@/utils/image-utils";
import { getFileDirFromPath, getPostUrlBySlug } from "@/utils/url-utils";

const getPostCover = async (
	image: string | undefined,
	id: string,
	filePath: string | undefined,
): Promise<string> => {
	const processedImage = processCoverImageSync(image, id);
	if (!processedImage) return "";

	const isLocalImage = !(
		processedImage.startsWith("/") ||
		processedImage.startsWith("http") ||
		processedImage.startsWith("data:")
	);
	if (!isLocalImage) return processedImage;

	const files = import.meta.glob<ImageMetadata>("../../**", {
		import: "default",
	});
	const basePath = getFileDirFromPath(filePath || "");
	const normalizedPath = path
		.normalize(path.join("../../", basePath, processedImage))
		.replace(/\\/g, "/");
	const file = files[normalizedPath];
	if (!file) return "";

	const resolvedImage = await file();
	return resolvedImage.src;
};

export async function GET(): Promise<Response> {
	const posts = await getSortedPosts();

	const allPostsData = await Promise.all(
		posts.map(async (post) => ({
			id: post.id,
			url: getPostUrlBySlug(post.id),
			title: post.data.title,
			description: post.data.description,
			image: await getPostCover(post.data.image, post.id, post.filePath),
			published: post.data.published.getTime(),
			category: post.data.category || "",
			tags: post.data.tags || [],
			searchText: [
				post.data.title,
				post.data.description,
				post.data.category || "",
				...(post.data.tags || []),
			]
				.filter(Boolean)
				.join(" "),
			password: !!post.data.password,
		})),
	);
		// 日历按纯日期排序，忽略置顶
	allPostsData.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData));
}
