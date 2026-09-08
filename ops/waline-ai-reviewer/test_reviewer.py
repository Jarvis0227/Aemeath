import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from reviewer import Config, Reviewer, RuntimeSettings, normalize_path, plain_text, strip_leading_reply_mention


BEIJING = timezone(timedelta(hours=8), name="Asia/Shanghai")


class ReviewerTests(unittest.TestCase):
	def setUp(self) -> None:
		self.temp_dir = tempfile.TemporaryDirectory()
		base = Path(self.temp_dir.name)
		key = base / "key"
		key.write_text("test-key", encoding="utf-8")
		self.config = Config(
			waline_db_path=base / "waline.sqlite",
			state_db_path=base / "state.sqlite",
			waline_base_url="http://127.0.0.1:8360",
			site_origin="https://rainzt.cn",
			site_root_path=None,
			friend_path="/friends/",
			bot_nick="小爱客服",
			bot_mail="ai-reviewer@rainzt.cn",
			bot_link="https://rainzt.cn/friends/",
			ai_endpoint="https://api.siliconflow.cn/v1/chat/completions",
			ai_model="Pro/moonshotai/Kimi-K2.6",
			ai_key_file=key,
			runtime_settings_path=base / "runtime.json",
			poll_seconds=5,
			post_interval_seconds=11,
			page_context_chars=7000,
			comment_chars=1200,
			max_attempts=3,
			smtp_config_path=None,
		)

	def tearDown(self) -> None:
		self.temp_dir.cleanup()

	def test_normalize_path(self) -> None:
		self.assertEqual(normalize_path("https://rainzt.cn/posts/demo?x=1"), "/posts/demo")
		self.assertEqual(normalize_path("/friends/"), "/friends/")

	def test_plain_text_removes_markup(self) -> None:
		self.assertEqual(plain_text("<p>你好 <strong>世界</strong></p>", 100), "你好 世界")

	def test_friend_day_template(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			reply, due = reviewer.friend_reply("小明", datetime(2026, 8, 17, 12, tzinfo=BEIJING))
			self.assertIn("亲爱的 小明 您好", reply)
			self.assertIsNone(due)
		finally:
			reviewer.close()

	def test_friend_night_template_and_due_time(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			reply, due = reviewer.friend_reply("小明", datetime(2026, 8, 17, 19, tzinfo=BEIJING))
			self.assertIn("明天上午 10 点", reply)
			self.assertEqual(datetime.fromtimestamp(due, BEIJING).hour, 10)
			self.assertEqual(datetime.fromtimestamp(due, BEIJING).day, 18)
		finally:
			reviewer.close()

	def test_friend_early_morning_matches_tomorrow_wording(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			reply, due = reviewer.friend_reply("小明", datetime(2026, 8, 18, 2, tzinfo=BEIJING))
			self.assertIn("明天上午 10 点", reply)
			self.assertEqual(datetime.fromtimestamp(due, BEIJING).day, 19)
		finally:
			reviewer.close()

	def test_disclaimer_is_plain_text_complete(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			settings = RuntimeSettings(True, "Pro/moonshotai/Kimi-K2.6", False, 0.55)
			reply = reviewer.add_disclaimer("谢谢你的留言。", settings)
			self.assertIn("ChatGPT 5.6 Sol Chat（没脑子的）模式", reply)
			self.assertIn("不代表本站观点", reply)
			self.assertNotIn("无法不代表本站观点", reply)
			self.assertNotIn("<small", reply)
			self.assertLessEqual(len(reply), 280)
		finally:
			reviewer.close()

	def test_generated_duplicate_mention_is_removed(self) -> None:
		self.assertEqual(
			strip_leading_reply_mention("@zzty： @zzty：你好，欢迎留言。", "zzty"),
			"你好，欢迎留言。",
		)
		self.assertEqual(
			strip_leading_reply_mention("[@zzty](#78): 你好，欢迎留言。", "zzty"),
			"你好，欢迎留言。",
		)
		self.assertEqual(strip_leading_reply_mention("你好，欢迎留言。", "zzty"), "你好，欢迎留言。")

	def test_reply_payload_keeps_modern_reply_metadata(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			self.assertEqual(
				reviewer.comment_endpoint(),
				"http://127.0.0.1:8360/api/comment?lang=zh-CN",
			)
			payload = reviewer.reply_payload(
				{"id": 80, "rid": 78, "url": "/posts/demo", "nick": "zzty"},
				"你好。",
			)
			self.assertEqual(payload["pid"], 80)
			self.assertEqual(payload["rid"], 78)
			self.assertEqual(payload["at"], "zzty")
			self.assertFalse(str(payload["comment"]).startswith("[@"))
		finally:
			reviewer.close()

	def test_root_reply_uses_itself_as_thread_root(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			payload = reviewer.reply_payload(
				{"id": 78, "rid": None, "url": "/posts/demo", "nick": "zzty"},
				"你好。",
			)
			self.assertEqual(payload["pid"], 78)
			self.assertEqual(payload["rid"], 78)
		finally:
			reviewer.close()

	def test_runtime_rules_skip_blocked_paths_keywords_and_daily_limit(self) -> None:
		reviewer = Reviewer(self.config, dry_run=True)
		try:
			row = {"url": "/private/demo", "comment": "普通留言"}
			settings = RuntimeSettings(True, "Pro/moonshotai/Kimi-K2.6", False, 0.55, blocked_paths=("/private/",))
			self.assertEqual(reviewer.rule_decision(row, settings)[0], "命中屏蔽路径")
			row["url"] = "/posts/demo"
			settings = RuntimeSettings(True, "Pro/moonshotai/Kimi-K2.6", False, 0.55, ignored_keywords=("广告",))
			row["comment"] = "这是广告留言"
			self.assertEqual(reviewer.rule_decision(row, settings)[0], "命中忽略关键词：广告")
			reviewer.state.record_event("auto_reply", "success")
			settings = RuntimeSettings(True, "Pro/moonshotai/Kimi-K2.6", False, 0.55, daily_limit=1)
			self.assertEqual(reviewer.rule_decision({"url": "/posts/demo", "comment": "你好"}, settings)[0], "达到每日自动回复上限")
		finally:
			reviewer.close()


if __name__ == "__main__":
	unittest.main()
