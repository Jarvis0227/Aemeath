<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

function read_cpu_times(): ?array
{
    $lines = @file('/proc/stat', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return null;
    }

    foreach ($lines as $line) {
        if (!str_starts_with($line, 'cpu ')) {
            continue;
        }

        $parts = preg_split('/\s+/', trim($line));
        if (!$parts || count($parts) < 5) {
            return null;
        }

        $values = array_map('floatval', array_slice($parts, 1, 8));
        $total = array_sum($values);
        $idle = ($values[3] ?? 0.0) + ($values[4] ?? 0.0);

        return ['total' => $total, 'idle' => $idle];
    }

    return null;
}

function read_memory_info(): ?array
{
    $lines = @file('/proc/meminfo', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return null;
    }

    $values = [];
    foreach ($lines as $line) {
        if (preg_match('/^(MemTotal|MemAvailable):\s+(\d+)\s+kB$/', $line, $match)) {
            $values[$match[1]] = (float) $match[2] * 1024;
        }
    }

    if (!isset($values['MemTotal'])) {
        return null;
    }

    $total = $values['MemTotal'];
    $available = $values['MemAvailable'] ?? 0.0;
    $used = max(0.0, $total - $available);

    return [
        'totalBytes' => $total,
        'availableBytes' => $available,
        'usedBytes' => $used,
        'usage' => $total > 0 ? ($used / $total) * 100 : 0.0,
    ];
}

function read_os_name(): string
{
    $contents = @file_get_contents('/etc/os-release');
    if ($contents && preg_match('/^PRETTY_NAME="?([^"\n]+)"?/m', $contents, $match)) {
        return trim($match[1]);
    }

    return 'Linux';
}

$firstCpu = read_cpu_times();
// 采样窗口拉长到 500ms，避免短窗口在低负载服务器上被量化成 0%。
usleep(500000);
$secondCpu = read_cpu_times();

$cpuUsage = null;
if ($firstCpu && $secondCpu) {
    $totalDelta = $secondCpu['total'] - $firstCpu['total'];
    $idleDelta = $secondCpu['idle'] - $firstCpu['idle'];
    if ($totalDelta > 0) {
        $cpuUsage = max(0.0, min(100.0, (($totalDelta - $idleDelta) / $totalDelta) * 100));
    }
}

$cpuInfo = @file_get_contents('/proc/cpuinfo') ?: '';
$cores = preg_match_all('/^processor\s*:/m', $cpuInfo, $unusedMatches);
$model = 'CPU';
if (preg_match('/^model name\s*:\s*(.+)$/m', $cpuInfo, $modelMatch)) {
    $model = trim($modelMatch[1]);
}

$memory = read_memory_info();
$diskTotal = @disk_total_space('/');
$diskFree = @disk_free_space('/');
$disk = null;
if (is_float($diskTotal) || is_int($diskTotal)) {
    $diskTotal = (float) $diskTotal;
    $diskFree = is_float($diskFree) || is_int($diskFree) ? (float) $diskFree : 0.0;
    $diskUsed = max(0.0, $diskTotal - $diskFree);
    $disk = [
        'totalBytes' => $diskTotal,
        'availableBytes' => $diskFree,
        'usedBytes' => $diskUsed,
        'usage' => $diskTotal > 0 ? ($diskUsed / $diskTotal) * 100 : 0.0,
    ];
}

$load = function_exists('sys_getloadavg') ? sys_getloadavg() : [];
$uptime = @file_get_contents('/proc/uptime');
$uptimeSeconds = $uptime && preg_match('/^(\d+(?:\.\d+)?)/', $uptime, $uptimeMatch)
    ? (float) $uptimeMatch[1]
    : null;

$response = [
    'ok' => true,
    'timestamp' => gmdate('c'),
    'cpu' => [
        'usage' => $cpuUsage,
        'cores' => $cores > 0 ? $cores : null,
        'model' => $model,
        'load1' => isset($load[0]) ? (float) $load[0] : null,
    ],
    'memory' => $memory,
    'disk' => $disk,
    'system' => [
        'name' => read_os_name(),
        'kernel' => php_uname('r'),
        'arch' => php_uname('m'),
        'uptimeSeconds' => $uptimeSeconds,
    ],
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
