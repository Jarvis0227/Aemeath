import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, test } from "node:test";
import type { FriendLatencySnapshot } from "../src/types/friendLatency";
import { getFriendLatencyDisplay } from "../src/utils/friend-latency";
import { measureFriend } from "./probe-friends";

const server = createServer((request, response) => {
	if (request.url === "/timeout") return;
	if (request.url === "/redirect") {
		response.writeHead(302, { location: "/ok" }).end();
		return;
	}
	response.writeHead(request.url === "/blocked" ? 403 : 200);
	response.flushHeaders();
	// Leave the body open to verify that the probe only waits for headers.
	response.write("headers received");
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string")
	throw new Error("Missing test server address");
const baseUrl = `http://127.0.0.1:${address.port}`;
after(() => {
	server.closeAllConnections();
	server.close();
});

test("measures response headers without waiting for the body, including redirects", async () => {
	for (const path of ["/ok", "/redirect"]) {
		const result = await measureFriend(`${baseUrl}${path}`, 1000);
		assert.equal(result.httpStatus, 200);
		assert.notEqual(result.state, "down");
		assert.ok(result.milliseconds > 0);
		assert.equal(result.failureReason, null);
	}
});

test("distinguishes HTTP errors from timeouts", async () => {
	const blocked = await measureFriend(`${baseUrl}/blocked`, 1000);
	assert.equal(blocked.state, "down");
	assert.equal(blocked.httpStatus, 403);
	const timeout = await measureFriend(`${baseUrl}/timeout`, 40);
	assert.equal(timeout.state, "down");
	assert.equal(timeout.httpStatus, null);
	assert.match(timeout.failureReason || "", /^Timeout after 40ms$/u);
});

test("displays measured values and explicit probe failures without declaring a friend lost", () => {
	const snapshot: FriendLatencySnapshot = {
		version: 1,
		generatedAt: "2026-10-24T03:00:00Z",
		probeLocation: "测试节点",
		results: {
			"example.com": {
				state: "fast",
				milliseconds: 123,
				checkedAt: "2026-10-24T03:00:00Z",
				httpStatus: 200,
				failureReason: null,
			},
		},
	};
	const success = getFriendLatencyDisplay(snapshot, "https://www.example.com/");
	assert.equal(success.value, "123ms");
	assert.match(success.label, /测试节点/u);
	assert.equal(
		getFriendLatencyDisplay(snapshot, "https://missing.example/").value,
		"未检测",
	);
	snapshot.results["example.com"].state = "down";
	snapshot.results["example.com"].httpStatus = 403;
	assert.equal(
		getFriendLatencyDisplay(snapshot, "https://example.com/").value,
		"HTTP 403",
	);
	snapshot.results["example.com"].httpStatus = null;
	snapshot.results["example.com"].failureReason = "Timeout after 6000ms";
	assert.equal(
		getFriendLatencyDisplay(snapshot, "https://example.com/").value,
		"超时",
	);
});
