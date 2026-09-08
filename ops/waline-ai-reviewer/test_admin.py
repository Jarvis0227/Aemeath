import http.client
import json
import re
import sqlite3
import tempfile
import threading
import time
import unittest
import urllib.parse
from pathlib import Path
from unittest.mock import patch

from admin_password import load_password_record, make_password_record, save_password, verify_password, verify_username
from admin_server import (
	ALLOWED_MODELS,
	AVATAR_PATH,
	AuditStore,
	BASE_PATH,
	DASHBOARD_PATH,
	LOGIN_CHALLENGE_COOKIE,
	LOGIN_CODE_ATTEMPTS,
	LOGIN_CODE_RECIPIENT,
	LOGIN_PATH,
	MANUAL_REPLY_DISCLAIMER,
	MAX_PUBLIC_REPLY_CHARS,
	POLISH_MODEL,
	POLISH_PATH,
	SESSION_SECONDS,
	AdminApplication,
	AdminConfig,
	AdminHTTPServer,
	LoginChallengeStore,
	LoginCodeSendLimiter,
	LoginRateLimiter,
	SessionStore,
	load_smtp_config,
	load_runtime,
	load_comment_inbox,
	polish_manual_reply,
	replace_api_key,
	save_runtime,
)


class AdminPrimitiveTests(unittest.TestCase):
	def test_official_model_allowlist_keeps_kimi_as_default(self) -> None:
		self.assertEqual(ALLOWED_MODELS, (
			"Pro/moonshotai/Kimi-K2.6",
			"deepseek-ai/DeepSeek-V4-Flash",
			"Pro/deepseek-ai/DeepSeek-V3.2",
			"MiniMaxAI/MiniMax-M2.5",
			"Pro/zai-org/GLM-5.1",
		))
		with tempfile.TemporaryDirectory() as directory:
			self.assertEqual(load_runtime(Path(directory) / "runtime.json")["model"], "Pro/moonshotai/Kimi-K2.6")

	def test_password_hash_is_salted_and_verifies(self) -> None:
		first = make_password_record("correct horse battery", "test-admin")
		second = make_password_record("correct horse battery", "test-admin")
		self.assertNotEqual(first["salt"], second["salt"])
		self.assertEqual(first["username"], "test-admin")
		self.assertTrue(verify_username("test-admin", first))
		self.assertFalse(verify_username("other-admin", first))
		self.assertTrue(verify_password("correct horse battery", first))
		self.assertFalse(verify_password("wrong password", first))

	def test_runtime_round_trip_and_model_allowlist(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "runtime.json"
			save_runtime(path, {"enabled": False, "model": ALLOWED_MODELS[0], "thinking": True, "temperature": 0.7})
			self.assertEqual(load_runtime(path), {
				"enabled": False,
				"model": ALLOWED_MODELS[0],
				"thinking": True,
				"temperature": 0.7,
				"rules": {
					"allowed_paths": [], "blocked_paths": [], "ignored_keywords": [],
					"quiet_start": "", "quiet_end": "", "daily_limit": 0,
				},
			})
			with self.assertRaises(ValueError):
				save_runtime(path, {"enabled": True, "model": "untrusted/model", "thinking": False, "temperature": 0.5})

	def test_runtime_rules_are_normalized_and_persisted(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "runtime.json"
			save_runtime(path, {
				"enabled": True, "model": ALLOWED_MODELS[0], "thinking": False, "temperature": 0.5,
				"rules": {
					"allowed_paths": "/posts/demo\nnot-a-path",
					"blocked_paths": ["/private", "/private"],
					"ignored_keywords": "广告\n合作",
					"quiet_start": "23:00", "quiet_end": "08:00", "daily_limit": "12",
				},
			})
			loaded = load_runtime(path)
			self.assertEqual(loaded["rules"]["allowed_paths"], ["/posts/demo"])
			self.assertEqual(loaded["rules"]["blocked_paths"], ["/private", "/private"])
			self.assertEqual(loaded["rules"]["ignored_keywords"], ["广告", "合作"])
			self.assertEqual(loaded["rules"]["quiet_start"], "23:00")
			self.assertEqual(loaded["rules"]["daily_limit"], 12)

	def test_audit_store_tracks_recent_events_and_daily_summary(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			store = AuditStore(Path(directory) / "state.sqlite")
			try:
				store.record("manual_reply", "success", source_id=42, model="manual", content="你好", duration_ms=18)
				store.record("polish", "failed", model=POLISH_MODEL, error="网络失败", duration_ms=7)
				self.assertEqual(store.summary()["total"], 2)
				self.assertEqual(store.summary()["success"], 1)
				self.assertEqual(store.recent(1)[0]["source_id"], None)
			finally:
				store.close()

	def test_key_replacement_never_keeps_old_value(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "siliconflow.key"
			path.write_text("old-secret-value\n", encoding="utf-8")
			replace_api_key(path, "new-secret-value")
			self.assertEqual(path.read_text(encoding="utf-8"), "new-secret-value\n")
			self.assertNotIn("old-secret-value", path.read_text(encoding="utf-8"))

	def test_polish_manual_reply_uses_kimi_instant_mode_and_keeps_emoji(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			key_path = Path(directory) / "siliconflow.key"
			key_path.write_text("server-only-key\n", encoding="utf-8")
			captured: dict[str, object] = {}

			class FakeResponse:
				status = 200

				def __enter__(self):
					return self

				def __exit__(self, *_args):
					return False

				def read(self, _limit: int = 0) -> bytes:
					return json.dumps({"choices": [{"message": {"content": "你好呀 😊，很高兴见到你。"}}]}, ensure_ascii=False).encode("utf-8")

			def fake_urlopen(request, **_kwargs):
				captured["request"] = request
				return FakeResponse()

			with patch("admin_server.urllib.request.urlopen", side_effect=fake_urlopen):
				polished = polish_manual_reply("你好 😊", key_path)
			self.assertEqual(polished, "你好呀 😊，很高兴见到你。")
			request = captured["request"]
			payload = json.loads(request.data.decode("utf-8"))
			self.assertEqual(payload["model"], POLISH_MODEL)
			self.assertFalse(payload["enable_thinking"])
			self.assertFalse(payload["stream"])
			self.assertIn("😊", payload["messages"][1]["content"])

	def test_login_limiter_blocks_after_five_failures(self) -> None:
		limiter = LoginRateLimiter(maximum=5, window_seconds=900)
		for _index in range(5):
			self.assertEqual(limiter.retry_after("127.0.0.1"), 0)
			limiter.fail("127.0.0.1")
		self.assertGreater(limiter.retry_after("127.0.0.1"), 0)

	def test_login_code_store_consumes_code_and_limits_attempts(self) -> None:
		store = LoginChallengeStore()
		challenge_id = store.create("012345")
		for remaining in range(LOGIN_CODE_ATTEMPTS - 1, 0, -1):
			result = store.verify(challenge_id, "999999")
			self.assertEqual((result.status, result.attempts_remaining), ("invalid", remaining))
		self.assertEqual(store.verify(challenge_id, "999999").status, "locked")
		self.assertEqual(store.verify(challenge_id, "012345").status, "missing")

		second_id = store.create("012345")
		self.assertEqual(store.verify(second_id, "012345").status, "verified")
		self.assertEqual(store.verify(second_id, "012345").status, "missing")

	def test_login_code_send_limiter_enforces_cooldown_and_window(self) -> None:
		limiter = LoginCodeSendLimiter(maximum=2, window_seconds=900, cooldown_seconds=60)
		self.assertEqual(limiter.reserve("127.0.0.1"), 0)
		self.assertGreater(limiter.reserve("127.0.0.1"), 0)
		limiter.release_latest("127.0.0.1")
		self.assertEqual(limiter.reserve("127.0.0.1"), 0)

		window_limiter = LoginCodeSendLimiter(maximum=2, window_seconds=900, cooldown_seconds=0)
		self.assertEqual(window_limiter.reserve("127.0.0.1"), 0)
		self.assertEqual(window_limiter.reserve("127.0.0.1"), 0)
		self.assertGreater(window_limiter.reserve("127.0.0.1"), 0)

	def test_smtp_loader_reuses_existing_json_shape(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "smtp.json"
			path.write_text(json.dumps({
				"host": "smtp.example.com",
				"port": 465,
				"secure": True,
				"user": "mailer@example.com",
				"password": "server-only-secret",
				"sender_email": "mailer@example.com",
				"author_email": "owner@example.com",
			}), encoding="utf-8")
			loaded = load_smtp_config(path)
			self.assertEqual(loaded["host"], "smtp.example.com")
			self.assertEqual(loaded["port"], 465)
			self.assertTrue(loaded["secure"])
			self.assertEqual(loaded["sender_email"], "mailer@example.com")

	def test_session_store_survives_restart_and_persists_flash(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "admin-sessions.json"
			first = SessionStore(path)
			session_id, session = first.create()
			first.set_flash(session_id, "已保存", True)

			second = SessionStore(path)
			restored = second.get(session_id)
			self.assertIsNotNone(restored)
			self.assertEqual(restored.csrf, session.csrf)
			self.assertEqual(restored.flash, ("已保存", True))
			self.assertEqual(second.pop_flash(session_id), ("已保存", True))
			self.assertIsNone(SessionStore(path).get(session_id).flash)

	def test_session_store_purges_expired_records_on_startup(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "admin-sessions.json"
			session_id = "A" * 43
			path.write_text(json.dumps({
				session_id: {
					"csrf": "B" * 43,
					"expires_at": time.time() - 1,
					"flash": None,
				},
			}), encoding="utf-8")
			store = SessionStore(path)
			self.assertIsNone(store.get(session_id))
			self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {})

	def test_session_store_writes_atomically_with_owner_only_mode(self) -> None:
		with tempfile.TemporaryDirectory() as directory:
			path = Path(directory) / "admin-sessions.json"
			with patch("admin_server.atomic_write") as writer:
				SessionStore(path).create()
			writer.assert_called_once()
			self.assertEqual(writer.call_args.kwargs["mode"], 0o600)


class AdminHTTPTests(unittest.TestCase):
	def setUp(self) -> None:
		self.temporary = tempfile.TemporaryDirectory()
		base = Path(self.temporary.name)
		self.runtime = base / "runtime.json"
		self.key = base / "siliconflow.key"
		self.password = base / "admin-password.json"
		self.smtp = base / "smtp.json"
		self.sessions = base / "admin-sessions.json"
		self.waline_db = base / "waline.sqlite"
		self.reviewer_config = base / "reviewer.json"
		self.asset_root = base / "public"
		(self.asset_root / "favicon").mkdir(parents=True)
		(self.asset_root / "favicon" / "chaoc-tingyu-avatar-512.png").write_bytes(b"png")
		self.key.write_text("initial-secret-key\n", encoding="utf-8")
		self.smtp.write_text(json.dumps({
			"host": "smtp.example.com",
			"port": 465,
			"secure": True,
			"user": "mailer@example.com",
			"password": "server-only-secret",
			"sender_email": "mailer@example.com",
		}), encoding="utf-8")
		save_password(self.password, "correct horse battery", "test-admin")
		save_runtime(self.runtime, {"enabled": True, "model": ALLOWED_MODELS[0], "thinking": False, "temperature": 0.55})
		connection = sqlite3.connect(self.waline_db)
		connection.execute(
			"""
			CREATE TABLE wl_Comment (
				id INTEGER PRIMARY KEY,
				nick TEXT,
				comment TEXT,
				insertedAt TEXT,
				url TEXT,
				rid INTEGER,
				pid INTEGER,
				mail TEXT,
				status TEXT
			)
			""",
		)
		connection.execute(
			"INSERT INTO wl_Comment (id, nick, comment, insertedAt, url, rid, pid, mail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			(42, "测试访客", "请问小爱可以手动回复吗？", "2026-08-26T10:00:00.000Z", "/guestbook/", None, None, "visitor@example.com", "approved"),
		)
		connection.commit()
		connection.close()
		self.reviewer_config.write_text(json.dumps({
			"waline_db_path": str(self.waline_db),
			"waline_base_url": "http://127.0.0.1:8360",
			"site_origin": "https://rainzt.cn",
			"bot_nick": "小爱客服",
			"bot_mail": "zhaozitan050227@gmail.com",
			"bot_link": "https://rainzt.cn/friends/",
		}), encoding="utf-8")
		template = Path(__file__).with_name("admin.html")
		self.config = AdminConfig(self.runtime, self.key, self.password, template, self.asset_root, "https://rainzt.cn", self.smtp, self.sessions, self.reviewer_config)
		self.application = AdminApplication(self.config)
		self.sent_codes: list[tuple[Path, str, str]] = []
		self.application.login_code_sender = lambda path, recipient, code: self.sent_codes.append((path, recipient, code))
		self.server = AdminHTTPServer(("127.0.0.1", 0), self.application)
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()
		self.port = self.server.server_address[1]

	def restart_server(self) -> None:
		self.server.shutdown()
		self.server.server_close()
		self.thread.join(timeout=2)
		self.application = AdminApplication(self.config)
		self.application.login_code_sender = lambda path, recipient, code: self.sent_codes.append((path, recipient, code))
		self.server = AdminHTTPServer(("127.0.0.1", 0), self.application)
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()
		self.port = self.server.server_address[1]

	def tearDown(self) -> None:
		self.server.shutdown()
		self.server.server_close()
		self.thread.join(timeout=2)
		self.temporary.cleanup()

	def request(self, method: str, path: str, body: dict[str, str] | None = None, headers: dict[str, str] | None = None):
		connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
		encoded = urllib.parse.urlencode(body or {}) if body is not None else None
		request_headers = dict(headers or {})
		if body is not None:
			request_headers["Content-Type"] = "application/x-www-form-urlencoded"
		connection.request(method, path, encoded, request_headers)
		response = connection.getresponse()
		content = response.read()
		headers_list = response.getheaders()
		connection.close()
		return response.status, headers_list, content

	@staticmethod
	def response_cookie(headers: list[tuple[str, str]], name: str) -> str:
		return next(
			value.split(";", 1)[0]
			for key, value in headers
			if key.lower() == "set-cookie" and value.startswith(f"{name}=") and not value.startswith(f"{name}=;")
		)

	def begin_login(self, *, origin_header: str = "Origin") -> tuple[str, str, str, bytes, list[tuple[str, str]]]:
		status, headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		login_cookie = self.response_cookie(headers, "waline_ai_login_csrf")
		request_headers = {"Cookie": login_cookie}
		if origin_header == "Origin":
			request_headers["Origin"] = "https://rainzt.cn"
		else:
			request_headers["Referer"] = "https://rainzt.cn/ai-comment-admin/login"
		status, headers, content = self.request(
			"POST",
			LOGIN_PATH,
			{
				"csrf": csrf,
				"stage": "credentials",
				"username": "test-admin",
				"password": "correct horse battery",
			},
			request_headers,
		)
		self.assertEqual(status, 200)
		challenge_cookie = self.response_cookie(headers, LOGIN_CHALLENGE_COOKIE)
		self.assertEqual(len(self.sent_codes), 1)
		code = self.sent_codes[-1][2]
		return csrf, f"{login_cookie}; {challenge_cookie}", code, content, headers

	def login(self) -> tuple[str, str]:
		csrf, cookies, code, _page, _headers = self.begin_login()
		status, headers, _content = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "stage": "verify", "verification_code": code},
			{"Cookie": cookies, "Origin": "https://rainzt.cn"},
		)
		self.assertEqual(status, 303)
		self.assertEqual(dict(headers).get("Location"), DASHBOARD_PATH)
		session_cookie = next(value for key, value in headers if key.lower() == "set-cookie" and value.startswith("waline_ai_admin_session="))
		self.assertIn("HttpOnly", session_cookie)
		self.assertIn("Secure", session_cookie)
		self.assertIn("SameSite=Strict", session_cookie)
		self.assertIn(f"Path={BASE_PATH}", session_cookie)
		self.assertIn(f"Max-Age={SESSION_SECONDS}", session_cookie)
		return session_cookie.split(";", 1)[0], csrf

	def test_login_requires_matching_origin(self) -> None:
		status, headers, page = self.request("GET", LOGIN_PATH)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = next(value for key, value in headers if key.lower() == "set-cookie").split(";", 1)[0]
		status, _headers, _content = self.request("POST", LOGIN_PATH, {"csrf": csrf, "username": "test-admin", "password": "correct horse battery"}, {"Cookie": cookie, "Origin": "https://evil.example"})
		self.assertEqual(status, 403)

	def test_login_accepts_same_origin_admin_referer_when_origin_is_missing(self) -> None:
		status, headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		self.assertEqual(dict(headers).get("Referrer-Policy"), "same-origin")
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = self.response_cookie(headers, "waline_ai_login_csrf")
		status, headers, _content = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "stage": "credentials", "username": "test-admin", "password": "correct horse battery"},
			{"Cookie": cookie, "Referer": "https://rainzt.cn/ai-comment-admin/login"},
		)
		self.assertEqual(status, 200)
		self.assertEqual(self.sent_codes[-1][1], LOGIN_CODE_RECIPIENT)
		self.assertRegex(self.sent_codes[-1][2], r"^[0-9]{6}$")

	def test_login_rejects_non_admin_referer_when_origin_is_missing(self) -> None:
		status, headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = next(value for key, value in headers if key.lower() == "set-cookie").split(";", 1)[0]
		status, _headers, _content = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "username": "test-admin", "password": "correct horse battery"},
			{"Cookie": cookie, "Referer": "https://rainzt.cn/friends/"},
		)
		self.assertEqual(status, 403)

	def test_wrong_username_uses_generic_login_error(self) -> None:
		status, headers, page = self.request("GET", LOGIN_PATH)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = next(value for key, value in headers if key.lower() == "set-cookie").split(";", 1)[0]
		status, _headers, content = self.request("POST", LOGIN_PATH, {"csrf": csrf, "username": "wrong-admin", "password": "correct horse battery"}, {"Cookie": cookie, "Origin": "https://rainzt.cn"})
		self.assertEqual(status, 401)
		self.assertIn("账号或密码错误".encode("utf-8"), content)
		self.assertNotIn("账号错误".encode("utf-8"), content)

	def test_reverse_proxy_clients_do_not_share_one_login_lockout(self) -> None:
		for _attempt in range(5):
			status, headers, page = self.request("GET", LOGIN_PATH)
			self.assertEqual(status, 200)
			csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
			cookie = self.response_cookie(headers, "waline_ai_login_csrf")
			status, _headers, _content = self.request(
				"POST",
				LOGIN_PATH,
				{"csrf": csrf, "stage": "credentials", "username": "wrong-admin", "password": "wrong-password"},
				{"Cookie": cookie, "Origin": "https://rainzt.cn", "X-Real-IP": "203.0.113.10"},
			)
			self.assertEqual(status, 401)

		status, headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = self.response_cookie(headers, "waline_ai_login_csrf")
		status, _headers, _content = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "stage": "credentials", "username": "test-admin", "password": "correct horse battery"},
			{"Cookie": cookie, "Origin": "https://rainzt.cn", "X-Real-IP": "203.0.113.11"},
		)
		self.assertEqual(status, 200)
		self.assertEqual(len(self.sent_codes), 1)

	def test_credentials_only_send_fixed_email_and_do_not_create_session(self) -> None:
		_csrf, _cookies, code, page, headers = self.begin_login()
		self.assertRegex(code, r"^[0-9]{6}$")
		self.assertEqual(self.sent_codes[0], (self.smtp, LOGIN_CODE_RECIPIENT, code))
		self.assertIn("195*****96@qq.com".encode("utf-8"), page)
		self.assertNotIn(LOGIN_CODE_RECIPIENT.encode("utf-8"), page)
		self.assertFalse(any(
			key.lower() == "set-cookie" and value.startswith("waline_ai_admin_session=")
			for key, value in headers
		))

	def test_login_and_verification_pages_expose_accessible_otp_flow(self) -> None:
		status, headers, login_page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		self.assertIn(b'name="stage" value="credentials"', login_page)
		self.assertIn(b'autocomplete="username"', login_page)
		self.assertIn(b'autocomplete="current-password"', login_page)
		self.assertIn("验证账号并发送验证码".encode("utf-8"), login_page)
		self.assertIn("195*****96@qq.com".encode("utf-8"), login_page)
		self.assertNotIn(LOGIN_CODE_RECIPIENT.encode("utf-8"), login_page)
		self.assertIn("script-src 'self' 'sha256-".encode("utf-8"), dict(headers)["Content-Security-Policy"].encode("utf-8"))

		_csrf, _cookies, _code, verification_page, verification_headers = self.begin_login()
		self.assertIn(b'name="stage" value="verify"', verification_page)
		self.assertIn(b'name="verification_code"', verification_page)
		self.assertIn(b'inputmode="numeric"', verification_page)
		self.assertIn(b'autocomplete="one-time-code"', verification_page)
		self.assertIn(b'pattern="[0-9]{6}"', verification_page)
		self.assertIn(b'data-resend-button', verification_page)
		self.assertIn(b'aria-live="polite"', verification_page)
		self.assertIn(b'<noscript>', verification_page)
		self.assertIn("登录状态将保留 30 天".encode("utf-8"), verification_page)
		self.assertIn("script-src 'self' 'sha256-".encode("utf-8"), dict(verification_headers)["Content-Security-Policy"].encode("utf-8"))

	def test_login_code_is_invalidated_after_five_wrong_attempts(self) -> None:
		csrf, cookies, _code, _page, _headers = self.begin_login()
		for attempt in range(LOGIN_CODE_ATTEMPTS):
			status, headers, page = self.request(
				"POST",
				LOGIN_PATH,
				{"csrf": csrf, "stage": "verify", "verification_code": "999999"},
				{"Cookie": cookies, "Origin": "https://rainzt.cn"},
			)
			self.assertEqual(status, 401)
			self.assertFalse(any(
				key.lower() == "set-cookie" and value.startswith("waline_ai_admin_session=")
				for key, value in headers
			))
			if attempt < LOGIN_CODE_ATTEMPTS - 1:
				self.assertIn("还可尝试".encode("utf-8"), page)
			else:
				self.assertIn("错误次数过多".encode("utf-8"), page)

	def test_expired_login_code_cannot_create_session(self) -> None:
		csrf, cookies, code, _page, _headers = self.begin_login()
		challenge_cookie = next(part.strip() for part in cookies.split(";") if part.strip().startswith(f"{LOGIN_CHALLENGE_COOKIE}="))
		challenge_id = challenge_cookie.split("=", 1)[1]
		self.application.login_challenges._challenges[challenge_id].expires_at = 0
		status, headers, page = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "stage": "verify", "verification_code": code},
			{"Cookie": cookies, "Origin": "https://rainzt.cn"},
		)
		self.assertEqual(status, 401)
		self.assertIn("验证码已过期".encode("utf-8"), page)
		self.assertFalse(any(
			key.lower() == "set-cookie" and value.startswith("waline_ai_admin_session=")
			for key, value in headers
		))

	def test_login_code_email_has_sixty_second_send_cooldown(self) -> None:
		self.begin_login()
		status, headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		cookie = self.response_cookie(headers, "waline_ai_login_csrf")
		status, headers, content = self.request(
			"POST",
			LOGIN_PATH,
			{"csrf": csrf, "stage": "credentials", "username": "test-admin", "password": "correct horse battery"},
			{"Cookie": cookie, "Origin": "https://rainzt.cn"},
		)
		self.assertEqual(status, 429)
		self.assertGreater(int(dict(headers)["Retry-After"]), 0)
		self.assertIn("发送过于频繁".encode("utf-8"), content)
		self.assertEqual(len(self.sent_codes), 1)

	def test_routes_are_confined_to_same_site_prefix(self) -> None:
		status, _headers, _content = self.request("GET", "/")
		self.assertEqual(status, 404)
		status, headers, _content = self.request("GET", BASE_PATH)
		self.assertEqual(status, 303)
		self.assertEqual(dict(headers).get("Location"), DASHBOARD_PATH)
		status, _headers, page = self.request("GET", LOGIN_PATH)
		self.assertEqual(status, 200)
		self.assertIn(f'action="{LOGIN_PATH}"'.encode(), page)
		self.assertIn(AVATAR_PATH.encode(), page)
		status, headers, avatar = self.request("GET", AVATAR_PATH)
		self.assertEqual(status, 200)
		self.assertEqual(dict(headers)["Content-Type"], "image/png")
		self.assertEqual(avatar, b"png")

	def test_authenticated_settings_require_csrf_and_reject_free_model(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		status, _headers, _content = self.request("POST", f"{BASE_PATH}/settings", {"csrf": "wrong", "model": ALLOWED_MODELS[0], "temperature": "0.5"}, {"Cookie": cookie, "Origin": "https://rainzt.cn"})
		self.assertEqual(status, 403)
		status, _headers, _content = self.request("POST", f"{BASE_PATH}/settings", {"csrf": csrf, "enabled": "1", "model": "free/form-model", "temperature": "0.5"}, {"Cookie": cookie, "Origin": "https://rainzt.cn"})
		self.assertEqual(status, 303)
		self.assertEqual(load_runtime(self.runtime)["model"], ALLOWED_MODELS[0])

	def test_dashboard_does_not_echo_key(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		self.assertNotIn(b"initial-secret-key", page)
		self.assertIn(AVATAR_PATH.encode(), page)

	def test_dashboard_includes_health_inbox_preview_and_audit_surfaces(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		for text in ("运行状态", "评论收件箱", "发布前预览", "快捷模板", "今日操作", "更新预览"):
			self.assertIn(text.encode("utf-8"), page)
		self.assertIn(b'data-select-comment data-comment-id="42"', page)

	def test_settings_save_rules_and_inbox_filters(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		status, _headers, _content = self.request(
			"POST",
			f"{BASE_PATH}/settings",
			{
				"csrf": csrf, "enabled": "1", "model": ALLOWED_MODELS[0], "temperature": "0.55",
				"allowed_paths": "/guestbook/", "blocked_paths": "/private/", "ignored_keywords": "广告",
				"quiet_start": "23:00", "quiet_end": "08:00", "daily_limit": "9",
			},
			{"Cookie": cookie, "Origin": "https://rainzt.cn"},
		)
		self.assertEqual(status, 303)
		rules = load_runtime(self.runtime)["rules"]
		self.assertEqual(rules["allowed_paths"], ["/guestbook/"])
		self.assertEqual(rules["blocked_paths"], ["/private/"])
		self.assertEqual(rules["ignored_keywords"], ["广告"])
		self.assertEqual(rules["daily_limit"], 9)

		connection = sqlite3.connect(self.waline_db)
		connection.execute(
			"INSERT INTO wl_Comment (id, nick, comment, insertedAt, url, rid, pid, mail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			(44, "已回复访客", "已经回复", "2026-08-26T10:02:00.000Z", "/guestbook/", 44, 42, "visitor2@example.com", "approved"),
		)
		connection.execute(
			"INSERT INTO wl_Comment (id, nick, comment, insertedAt, url, rid, pid, mail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			(45, "小爱客服", "回复", "2026-08-26T10:03:00.000Z", "/guestbook/", 45, 42, "zhaozitan050227@gmail.com", "approved"),
		)
		connection.commit()
		connection.close()
		status, _headers, page = self.request("GET", f"{DASHBOARD_PATH}?reply_state=replied", headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		self.assertIn(b"#42", page)

	def test_manual_reply_uses_bot_identity_and_keeps_public_disclaimer(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		self.assertIn(b"value=\"42\"", page)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		captured: dict[str, object] = {}

		class FakeResponse:
			def __enter__(self):
				return self

			def __exit__(self, *_args):
				return False

			def read(self, _limit: int = 0) -> bytes:
				return b'{"errno":0,"data":{"objectId":99,"status":"approved"}}'

		def fake_urlopen(request, **_kwargs):
			captured["request"] = request
			return FakeResponse()

		with patch("admin_server.urllib.request.urlopen", side_effect=fake_urlopen):
			status, headers, _content = self.request(
				"POST",
				f"{BASE_PATH}/reply",
				{"csrf": csrf, "comment_id": "42", "reply": "你好，这是一条手动回复。"},
				{"Cookie": cookie, "Origin": "https://rainzt.cn"},
			)
		self.assertEqual(status, 303)
		self.assertEqual(dict(headers).get("Location"), DASHBOARD_PATH)
		request = captured["request"]
		payload = json.loads(request.data.decode("utf-8"))
		self.assertEqual(payload["nick"], "小爱客服")
		self.assertEqual(payload["mail"], "zhaozitan050227@gmail.com")
		self.assertEqual(payload["pid"], 42)
		self.assertEqual(payload["rid"], 42)
		self.assertEqual(payload["at"], "测试访客")
		self.assertTrue(payload["comment"].startswith("你好，这是一条手动回复。"))
		self.assertTrue(payload["comment"].endswith(MANUAL_REPLY_DISCLAIMER))
		self.assertLessEqual(len(payload["comment"]), MAX_PUBLIC_REPLY_CHARS)
		self.assertEqual(request.get_header("Origin"), "https://rainzt.cn")
		self.assertEqual(request.get_header("Referer"), "https://rainzt.cn/guestbook/")
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		self.assertIn("已以小爱客服身份发布回复".encode("utf-8"), page)

	def test_authenticated_polish_route_returns_json_without_publishing(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		with patch("admin_server.polish_manual_reply", return_value="你好呀 😊，欢迎回来！") as polisher:
			status, headers, content = self.request(
				"POST",
				POLISH_PATH,
				{"csrf": csrf, "reply": "你好 😊"},
				{"Cookie": cookie, "Origin": "https://rainzt.cn", "Accept": "application/json"},
			)
		self.assertEqual(status, 200)
		self.assertIn("application/json", dict(headers)["Content-Type"])
		self.assertEqual(json.loads(content), {"ok": True, "reply": "你好呀 😊，欢迎回来！", "model": POLISH_MODEL, "mode": "即时"})
		polisher.assert_called_once_with("你好 😊", self.key)

	def test_authenticated_polish_route_rejects_empty_draft(self) -> None:
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		with patch("admin_server.polish_manual_reply", side_effect=ValueError("请先输入要润色的回复内容")) as polisher:
			status, _headers, content = self.request(
				"POST",
				POLISH_PATH,
				{"csrf": csrf, "reply": "   "},
				{"Cookie": cookie, "Origin": "https://rainzt.cn", "Accept": "application/json"},
			)
		self.assertEqual(status, 400)
		self.assertEqual(json.loads(content)["ok"], False)
		polisher.assert_called_once_with("   ", self.key)

	def test_manual_reply_rejects_unapproved_comment_without_publishing(self) -> None:
		connection = sqlite3.connect(self.waline_db)
		connection.execute(
			"INSERT INTO wl_Comment (id, nick, comment, insertedAt, url, rid, pid, mail, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			(43, "待审核", "还不能回复", "2026-08-26T10:01:00.000Z", "/guestbook/", None, None, "pending@example.com", "waiting"),
		)
		connection.commit()
		connection.close()
		cookie, _login_csrf = self.login()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		with patch("admin_server.publish_manual_reply") as publisher:
			status, _headers, _content = self.request(
				"POST",
				f"{BASE_PATH}/reply",
				{"csrf": csrf, "comment_id": "43", "reply": "不应发送"},
				{"Cookie": cookie, "Origin": "https://rainzt.cn"},
			)
		self.assertEqual(status, 303)
		publisher.assert_not_called()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertIn("目标评论尚未通过审核".encode("utf-8"), page)

	def test_authenticated_session_survives_service_restart(self) -> None:
		cookie, _login_csrf = self.login()
		self.assertTrue(self.sessions.is_file())
		self.restart_server()
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		self.assertIn(AVATAR_PATH.encode(), page)

	def test_logout_persistently_deletes_session(self) -> None:
		cookie, _login_csrf = self.login()
		session_id = cookie.split("=", 1)[1]
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 200)
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		status, headers, _content = self.request(
			"POST",
			f"{BASE_PATH}/logout",
			{"csrf": csrf},
			{"Cookie": cookie, "Origin": "https://rainzt.cn"},
		)
		self.assertEqual(status, 303)
		self.assertEqual(dict(headers).get("Location"), LOGIN_PATH)
		self.assertIsNone(SessionStore(self.sessions).get(session_id))
		self.assertEqual(json.loads(self.sessions.read_text(encoding="utf-8")), {})

	def test_password_change_rotates_sessions(self) -> None:
		cookie, _login_csrf = self.login()
		session_id = cookie.split("=", 1)[1]
		status, _headers, page = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		csrf = re.search(br'name="csrf" value="([^"]+)"', page).group(1).decode("ascii")
		status, _headers, _content = self.request("POST", f"{BASE_PATH}/password", {"csrf": csrf, "current_password": "correct horse battery", "new_password": "new correct horse battery", "confirm_password": "new correct horse battery"}, {"Cookie": cookie, "Origin": "https://rainzt.cn"})
		self.assertEqual(status, 303)
		self.assertTrue(verify_password("new correct horse battery", load_password_record(self.password)))
		status, headers, _content = self.request("GET", DASHBOARD_PATH, headers={"Cookie": cookie})
		self.assertEqual(status, 303)
		self.assertEqual(dict(headers).get("Location"), LOGIN_PATH)
		self.assertIsNone(SessionStore(self.sessions).get(session_id))
		self.assertEqual(json.loads(self.sessions.read_text(encoding="utf-8")), {})


if __name__ == "__main__":
	unittest.main()
