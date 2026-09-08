# Waline 邮件模板

`templates/admin-new-comment.html` 是站长收到新评论时使用的蓝白邮件模板。它对应 Waline 的 `MAIL_TEMPLATE_ADMIN` / `mailTemplateAdmin`，与访客收到回复时使用的 `MAIL_TEMPLATE` / `mailTemplate` 不是同一项。

模板中的图片均使用 `https://rainzt.cn/` 绝对地址，避免邮件客户端无法加载相对路径资源。

## 接入 Waline 服务端

把整个 `waline` 目录复制到 Waline 服务端项目中，然后在服务端入口配置：

```js
const Waline = require("@waline/vercel");
const mailOptions = require("./waline/mail-options.cjs");

module.exports = Waline(mailOptions);
```

若入口已经传入其他配置，合并 `mailOptions`：

```js
module.exports = Waline({
  ...existingOptions,
  ...mailOptions,
});
```

长 HTML 不建议直接粘贴到 Vercel 环境变量；环境变量有长度限制时，应使用上述服务端文件配置。其他部署方式也可以将模板文件完整内容写入 `MAIL_TEMPLATE_ADMIN`，并将邮件标题设置为：

```text
{{site.name | safe}} · 收到新评论
```
