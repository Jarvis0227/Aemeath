export type FriendLatencyState = "fast" | "normal" | "slow" | "down";

export type FriendProbeResult = {
	state: FriendLatencyState;
	milliseconds: number;
	checkedAt: string;
	httpStatus: number | null;
	failureReason: string | null;
};

export type FriendLatencySnapshot = {
	version: number;
	generatedAt: string | null;
	probeLocation: string;
	results: Record<string, FriendProbeResult>;
};
