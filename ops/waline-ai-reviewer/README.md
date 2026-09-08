# Waline 小爱客服

这是部署在博客服务器上的独立评论回复服务。它以只读方式发现 Waline SQLite 中的新评论，并始终通过 Waline HTTP API 发布回复，不直接写入 Waline 数据库。

行为：

- `/friends/` 的新顶层评论按北京时间使用固定友链审核话术。
- 其他页面与文章根据页面正文和评论内容，由当前后台选定的 SiliconFlow 模型生成回复。
- 默认使用 `Pro/moonshotai/Kimi-K2.6` 即时模式；后台可切换允许的模型、即时/思考模式、温度，也可暂停自动回复。
- 机器人自己的评论会被忽略；状态数据库和已有机器人子回复共同防止重复与循环。
- 晚间友链申请会排队，在下一个北京时间 10:00 给站长发送提醒邮件。
- AI 连续失败三次后发布透明的兜底回复，不冒充站长。
- Waline 会自己显示被回复者，服务会清理模型正文开头重复生成的 `@昵称`。
- 每条自动回复都会附带统一声明；前端据此展示“小爱客服”头像、AI 标签和灰色说明文字。
- 可按页面路径、屏蔽路径、忽略关键词、北京时间安静时段和每日上限控制自动回复；规则跳过会保留原因，不会丢失评论。

## 管理后台

后台仅监听服务器本机 `127.0.0.1:8371`，由 Nginx 通过 `https://rainzt.cn/ai-comment-admin/` 反向代理。它支持：

- 启用或暂停自动回复；
- 切换允许的模型、即时/思考模式和温度；
- 查看评论收件箱，按昵称、内容、页面、审核状态和是否已回复筛选；
- 手动回复支持草稿自动保存、快捷模板、KIMI 润色、发布前最终预览，并拦截重复回复；
- 查看自动回复进程、Waline 评论库、AI 服务健康状态，以及今日用量和最近审计记录；
- 从最近已审核评论中选择目标，手动以“小爱客服”身份发布回复（公开视觉与自动回复一致，并保留统一 AI 说明）；
- 原子替换 SiliconFlow API Key，并进行显式连通测试；
- 修改后台登录密码并注销全部会话。

手动回复同样只接受已登录后台的 CSRF 保护请求。后台从服务端只读的 `waline_db_path` 查找评论，再通过 Waline HTTP API 创建子评论；评论数据库不会被直接写入。评论 ID 也可以直接输入，因此不局限于最近列表。后台与 reviewer 共享 `state_db_path`，自动回复、手动回复、KIMI 润色、失败和规则跳过会统一写入 `reply_events` 审计表。

`runtime.json` 中的规则也可以直接配置：路径规则每行一个，关键词每行一个；安静时段要求开始和结束时间同时填写，`daily_limit: 0` 表示不限。后台的红色健康卡会显示最近心跳错误，审计表会保留失败原因，方便接入服务器级监控或邮件告警。

登录密码只保存 PBKDF2-SHA256 哈希；API Key 从不回显到页面。初始化账号和密码时使用交互输入或标准输入，禁止把明文写进命令历史、仓库或 systemd 单元。

## 安全

`config.example.json` 与 `smtp.example.json` 不含任何真实密钥。静态配置放在服务器的 `/etc/waline-ai-reviewer/`；可变运行设置、API Key、密码哈希和状态数据库放在 `/var/lib/waline-ai-reviewer/`，只授权给专用的 `waline-ai-reviewer` 系统用户。不得把 API Key、SMTP 密码或 Waline 管理员凭据写入仓库、日志或镜像。生产环境还应为 `bot_mail` 使用不公开的专用地址，防止访客仅靠同名伪装成机器人。

systemd 单元会通过 `StateDirectory=waline-ai-reviewer` 创建独立状态目录。安装前仍需创建专用系统用户，并授予它对 Waline SQLite、生产配置和密钥的最小只读权限。

## 本地验证

```bash
python -m py_compile reviewer.py
python -m py_compile admin_server.py admin_password.py
python -m unittest -v test_reviewer.py test_admin.py
```

## 服务器检查

```bash
python3 /opt/waline-ai-reviewer/reviewer.py \
  --config /etc/waline-ai-reviewer/config.json \
  --check --probe-ai
```

该检查只读取 Waline、探测首页并发起一次最小 AI 即时模式请求，不会发布评论。
