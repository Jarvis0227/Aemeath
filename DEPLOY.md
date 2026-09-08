# Rainzt.cn 部署说明

这份文档给后续维护者或 AI 使用。项目真正维护目录是当前仓库根目录，部署到线上的是 `dist/` 静态构建产物。

## 基本信息

- 线上域名：`https://rainzt.cn/`
- 服务器地址：通过部署时的 `FIREFLY_HOST` 环境变量提供（不要写入仓库）
- SSH 用户：通过部署时的 `FIREFLY_USER` 环境变量提供
- 网站根目录：通过部署时的 `FIREFLY_SITE_PATH` 环境变量提供
- Web 服务：宝塔面板 + Nginx
- 部署内容：本地 `dist/` 目录里的全部文件

不要把服务器密码写进仓库。部署时让用户提供密码，或临时放到当前终端环境变量里。

## 本地构建

在项目根目录执行：

```powershell
pnpm build
```

构建成功后会生成或更新：

```txt
dist/
```

如果用户已经明确说“我构建好了”，可以直接部署当前 `dist/`。部署前可快速检查时间：

```powershell
Get-ChildItem -LiteralPath dist | Select-Object -First 8 Name,Mode,Length,LastWriteTime
```

## 部署原则

部署时不要只覆盖文件，要先清空网站根目录再解压新 `dist`。

原因：Astro/Vite 生成的 `_astro` 资源带 hash。只覆盖不删除会残留旧 CSS/JS，可能导致线上还是旧交互、旧样式或缓存异常。

推荐流程：

1. 将本地 `dist` 打成 `.tgz`
2. 上传到服务器 `/tmp/firefly-dist-latest.tgz`
3. 临时备份服务器上的网站目录
4. 清空 `FIREFLY_SITE_PATH`
5. 解压新包到 `FIREFLY_SITE_PATH`
6. 设置权限
7. `nginx -t`
8. reload Nginx
9. 部署成功后删除临时备份

## PowerShell 部署命令

下面命令依赖临时 Node 工具目录中的 `ssh2`。如果没有该目录，先准备一次：

```powershell
$deployDir = Join-Path $env:TEMP 'firefly-deploy-node'
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null
Push-Location $deployDir
if (-not (Test-Path package.json)) { npm init -y | Out-Null }
npm install ssh2 --silent
Pop-Location
```

创建部署脚本：

```powershell
$deployDir = Join-Path $env:TEMP 'firefly-deploy-node'
$scriptPath = Join-Path $deployDir 'deploy-firefly-clean.js'
@'
const fs = require('fs');
const { Client } = require('ssh2');

const host = process.env.FIREFLY_HOST;
const username = process.env.FIREFLY_USER;
const password = process.env.FIREFLY_PASS;
const sitePath = process.env.FIREFLY_SITE_PATH;
const localArchive = process.env.FIREFLY_ARCHIVE;
const remoteArchive = '/tmp/firefly-dist-latest.tgz';

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`Remote command failed (${code})\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      });
      stream.on('data', (d) => { stdout += d.toString(); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); });
    });
  });
}

function fastPut(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(local, remote, (putErr) => putErr ? reject(putErr) : resolve());
    });
  });
}

(async () => {
  if (!sitePath) throw new Error('FIREFLY_SITE_PATH is required');
  if (!fs.existsSync(localArchive)) throw new Error(`Archive not found: ${localArchive}`);
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({ host, username, password, readyTimeout: 30000 });
  });

  console.log('connected');
  await fastPut(conn, localArchive, remoteArchive);
  console.log('uploaded');

  const command = String.raw`set -e
  SITE=${JSON.stringify(sitePath)}
ARCH=/tmp/firefly-dist-latest.tgz
BACKUP=/www/backup/firefly-temp-$(date +%Y%m%d%H%M%S)
mkdir -p /www/backup
if [ -d "$SITE" ]; then
  mkdir -p "$BACKUP"
  cp -a "$SITE"/. "$BACKUP"/ || true
else
  mkdir -p "$SITE"
fi
find "$SITE" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -xzf "$ARCH" -C "$SITE"
if id www >/dev/null 2>&1; then chown -R www:www "$SITE"; fi
find "$SITE" -type d -exec chmod 755 {} \;
find "$SITE" -type f -exec chmod 644 {} \;
if [ -x /www/server/nginx/sbin/nginx ]; then
  /www/server/nginx/sbin/nginx -t
  /www/server/nginx/sbin/nginx -s reload
else
  nginx -t
  nginx -s reload
fi
rm -f "$ARCH"
rm -rf -- "$BACKUP"
echo "deployed=$(date -Iseconds)"
echo "temp_backup_removed=$BACKUP"`;

  const result = await exec(conn, command);
  if (result.stderr.trim()) console.error(result.stderr.trim());
  console.log(result.stdout.trim());
  conn.end();
})().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
'@ | Set-Content -LiteralPath $scriptPath -Encoding UTF8
```

打包并部署：

```powershell
$archive = Join-Path $env:TEMP 'firefly-dist-latest.tgz'
if (Test-Path $archive) { Remove-Item -LiteralPath $archive -Force }
tar -czf $archive -C dist .

$env:FIREFLY_HOST = '<server-host-or-ip>'
$env:FIREFLY_USER = '<ssh-user>'
$env:FIREFLY_SITE_PATH = '<absolute-site-path>'
$env:FIREFLY_PASS = '<set temporarily in your local terminal; never commit it>'
$env:FIREFLY_ARCHIVE = $archive

node "$env:TEMP\firefly-deploy-node\deploy-firefly-clean.js"
```

部署成功时会看到类似：

```txt
connected
uploaded
nginx: the configuration file /www/server/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /www/server/nginx/conf/nginx.conf test is successful
deployed=...
temp_backup_removed=/www/backup/firefly-temp-...
```

## 线上验证

部署后至少检查首页：

```powershell
$r = Invoke-WebRequest -Uri 'https://rainzt.cn/?v=deploy-check' -UseBasicParsing -TimeoutSec 30
$r.StatusCode
```

如果根目录验证文件需要保留，也检查：

```powershell
$r = Invoke-WebRequest -Uri 'https://rainzt.cn/dd5c6845bdaa3bdb252327d236acea31.txt?v=deploy-check' -UseBasicParsing -TimeoutSec 30
$r.Content.Trim()
```

正确内容：

```txt
363898a6a033a4445484873190b69882ac81fcea
```

## 注意事项

- 如站点使用域名验证文件，请按服务商要求保留对应的 `public/` 文件。
- 不要提交服务器密码、私钥或宝塔面板凭据。
- 不要手动删证书目录。部署只操作 `FIREFLY_SITE_PATH` 指定的网站根目录。
- 如果线上样式或交互像旧版，优先确认是否完整清空旧文件后再解压新 `dist`。
- `dist/` 是构建产物，通常不需要提交到 Git。
