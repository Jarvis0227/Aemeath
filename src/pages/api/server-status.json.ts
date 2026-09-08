import os from "node:os";
import { statfsSync } from "node:fs";

type CpuSnapshot = { idle: number; total: number };

const readCpuSnapshot = (): CpuSnapshot => {
	const cpus = os.cpus();
	const idle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
	const total = cpus.reduce(
		(sum, cpu) => sum + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq,
		0,
	);
	return { idle, total };
};

const readCpuUsage = async (): Promise<number> => {
	const first = readCpuSnapshot();
	// 采样窗口拉长到 500ms，避免短窗口在低负载服务器上被量化成 0%。
	await new Promise((resolve) => setTimeout(resolve, 500));
	const second = readCpuSnapshot();
	const totalDelta = second.total - first.total;
	const idleDelta = second.idle - first.idle;
	return totalDelta > 0 ? Math.max(0, Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100)) : 0;
};

export async function GET(): Promise<Response> {
	const cpus = os.cpus();
	const cpuUsage = await readCpuUsage();
	const totalMemory = os.totalmem();
	const availableMemory = os.freemem();
	const usedMemory = Math.max(0, totalMemory - availableMemory);
	const filesystem = statfsSync(process.cwd());
	const totalDisk = Number(filesystem.blocks) * Number(filesystem.bsize);
	const availableDisk = Number(filesystem.bavail) * Number(filesystem.bsize);
	const usedDisk = Math.max(0, totalDisk - availableDisk);
	const load = os.loadavg();

	return new Response(
		JSON.stringify({
			ok: true,
			timestamp: new Date().toISOString(),
			cpu: {
				usage: cpuUsage,
				cores: cpus.length,
				model: cpus[0]?.model || "CPU",
				load1: load[0] || 0,
			},
			memory: {
				totalBytes: totalMemory,
				availableBytes: availableMemory,
				usedBytes: usedMemory,
				usage: totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0,
			},
			disk: {
				totalBytes: totalDisk,
				availableBytes: availableDisk,
				usedBytes: usedDisk,
				usage: totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0,
			},
			system: {
				name: `${os.platform()} ${os.release()}`,
				kernel: os.release(),
				arch: os.arch(),
				uptimeSeconds: os.uptime(),
			},
		}),
		{ headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
	);
}
