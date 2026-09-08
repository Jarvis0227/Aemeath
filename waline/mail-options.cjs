const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  mailSubjectAdmin: "{{site.name | safe}} · 收到新评论",
  mailTemplateAdmin: fs.readFileSync(
    path.join(__dirname, "templates", "admin-new-comment.html"),
    "utf8",
  ),
};
