import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getEnabledFriends } from "../src/config/friendsConfig";
import type {
	FriendLatencySnapshot,
	FriendProbeResult,
} from "../src/types/friendLatency";
import { normalizeFriendLatencyUrl } from "../src/utils/friend-latency";

const REQUEST_TIMEOUT_MS = 6000;
const MAX_CONCURRENT_CHECKS = 4;
const snapshotUrl = new URL(
	"../src/data/friends-latency-snapshot.json",
	import.meta.url,
);

export async function measureFriend(
	siteUrl: string,
	timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<FriendProbeResult> {
	const checkedAt = new Date().toISOString();
	const startedAt = performance.now();
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const url = new URL(siteUrl);
		if (!/^https?:$/u.test(url.protocol))
			throw new Error("Unsupported protocol");
		const response = await fetch(url, {
			method: "GET",
			cache: "no-store",
			redirect: "follow",
			headers: { "user-agent": "Aemeath-friend-latency-probe/1.0" },
			signal: controller.signal,
		});
		// Stop timing at the headers; do not download whole homepages.
		const milliseconds = Math.max(1, Math.round(performance.now() - startedAt));
		try {
			await response.body?.cancel();
		} catch {
			/* Headers already received. */
		}
		return {
			state: !response.ok
				? "down"
				: milliseconds < 500
					? "fast"
					: milliseconds < 1000
						? "normal"
						: "slow",
			milliseconds,
			checkedAt,
			httpStatus: response.status,
			failureReason: response.ok ? null : `HTTP ${response.status}`,
		};
	} catch (error) {
		return {
			state: "down",
			milliseconds: Math.max(1, Math.round(performance.now() - startedAt)),
			checkedAt,
			httpStatus: null,
			failureReason: controller.signal.aborted
				? `Timeout after ${timeoutMs}ms`
				: error instanceof Error
					? error.message
					: String(error),
		};
	} finally {
		clearTimeout(timer);
	}
}

async function probeFriends(): Promise<void> {
	const args = process.argv.slice(2);
	const selectedSite = args.find((arg) => arg.startsWith("--site="))?.slice(7);
	const queue = getEnabledFriends().filter(
		(friend) =>
			!selectedSite ||
			normalizeFriendLatencyUrl(friend.siteurl) ===
				normalizeFriendLatencyUrl(selectedSite),
	);
	if (!queue.length)
		throw new Error("No enabled friends match the requested probe.");
	const total = queue.length;
	const results: Record<string, FriendProbeResult> = {};
	let completed = 0;
	async function worker(): Promise<void> {
		while (queue.length) {
			const friend = queue.shift();
			if (!friend) return;
			results[normalizeFriendLatencyUrl(friend.siteurl)] = await measureFriend(
				friend.siteurl,
			);
			completed++;
			if (completed % 10 === 0 || completed === total)
				console.info(`Probed ${completed}/${total} friend sites.`);
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(MAX_CONCURRENT_CHECKS, total) }, worker),
	);
	if (!args.includes("--diagnostic-only")) {
		const previous = selectedSite
			? (JSON.parse(
					await readFile(snapshotUrl, "utf8"),
				) as FriendLatencySnapshot)
			: null;
		const probeLocation =
			process.env.GITHUB_ACTIONS === "true"
				? "GitHub Actions 探测节点"
				: "本地探测节点";
		const snapshot: FriendLatencySnapshot = {
			version: 1,
			generatedAt: new Date().toISOString(),
			probeLocation,
			results: {
				...(previous?.probeLocation === probeLocation ? previous.results : {}),
				...results,
			},
		};
		await writeFile(
			snapshotUrl,
			`${JSON.stringify(snapshot, null, "\t")}\n`,
			"utf8",
		);
	}
	console.info(
		`HTTP probes complete: ${total - Object.values(results).filter((result) => result.state === "down").length}/${total} returned successful responses. Visibility settings unchanged.`,
	);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await probeFriends();
}
