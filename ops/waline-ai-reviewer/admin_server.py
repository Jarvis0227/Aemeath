#!/usr/bin/env python3
"""Local-only administrative server for the Waline AI reviewer."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import http.cookies
import ipaddress
import json
import logging
import math
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from string import Template
from typing import Any

from admin_password import atomic_write, load_password_record, save_password, verify_password, verify_username
from reviewer import BOT_VERSION, MAX_PUBLIC_REPLY_CHARS, PUBLIC_REPLY_DISCLAIMER, normalize_path, plain_text


LOG = logging.getLogger("waline-ai-admin")
BIND_HOST = "127.0.0.1"
BIND_PORT = 8371
SESSION_COOKIE = "waline_ai_admin_session"
LOGIN_CSRF_COOKIE = "waline_ai_login_csrf"
LOGIN_CHALLENGE_COOKIE = "waline_ai_login_challenge"
SESSION_SECONDS = 30 * 24 * 60 * 60
LOGIN_CODE_SECONDS = 10 * 60
LOGIN_CODE_ATTEMPTS = 5
LOGIN_CODE_SEND_MAXIMUM = 3
LOGIN_CODE_SEND_WINDOW_SECONDS = 15 * 60
LOGIN_CODE_SEND_COOLDOWN_SECONDS = 60
LOGIN_CODE_RECIPIENT = "1953549196@qq.com"
DEFAULT_SMTP_CONFIG_PATH = Path("/etc/waline-ai-reviewer/smtp.json")
DEFAULT_SESSION_PATH = Path("/var/lib/waline-ai-reviewer/admin-sessions.json")
DEFAULT_REVIEWER_CONFIG_PATH = Path("/etc/waline-ai-reviewer/config.json")
MAX_BODY_BYTES = 64 * 1024
SILICONFLOW_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions"
BASE_PATH = "/ai-comment-admin"
DASHBOARD_PATH = f"{BASE_PATH}/"
LOGIN_PATH = f"{BASE_PATH}/login"
POLISH_PATH = f"{BASE_PATH}/polish"
AVATAR_PATH = f"{BASE_PATH}/assets/ai-xiaoai-avatar.png"
AVATAR_URL = f"{AVATAR_PATH}?v=20260907"
POLISH_MODEL = "Pro/moonshotai/Kimi-K2.6"
ALLOWED_MODELS = (
	"Pro/moonshotai/Kimi-K2.6",
	"deepseek-ai/DeepSeek-V4-Flash",
	"Pro/deepseek-ai/DeepSeek-V3.2",
	"MiniMaxAI/MiniMax-M2.5",
	"Pro/zai-org/GLM-5.1",
)
# Keep the public footer byte-for-byte compatible with automatic replies so the
# existing Waline presentation treats a manual message as the same Xiaoai role.
MANUAL_REPLY_DISCLAIMER = PUBLIC_REPLY_DISCLAIMER
MANUAL_REPLY_MAX_CHARS = MAX_PUBLIC_REPLY_CHARS - len(MANUAL_REPLY_DISCLAIMER) - 2
RECENT_COMMENT_LIMIT = 40
INBOX_PAGE_SIZE = 12
BEIJING = timezone(timedelta(hours=8), name="Asia/Shanghai")

LOGIN_PAGE_STYLES = """
:root{color-scheme:light;--blue:#2f9ee9;--blue-deep:#176bb4;--blue-soft:#eaf7ff;--blue-pale:#f6fbff;--yellow:#fff0a8;--ink:#18334f;--muted:#617990;--line:#d8e8f4;--danger:#b23b50;--danger-bg:#fff0f2;--success:#217a58;--success-bg:#ebfbf3;--shadow:0 28px 78px rgba(42,93,137,.18)}
*{box-sizing:border-box}
html{min-width:320px;background:#eaf4fb}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:clamp(16px,4vw,40px);background:#eaf4fb;color:var(--ink);font-family:"Microsoft YaHei UI","PingFang SC","Noto Sans SC",system-ui,sans-serif;line-height:1.55}
body::before,body::after{content:"";position:fixed;z-index:0;border-radius:50%;pointer-events:none}
body::before{width:300px;height:300px;inset:-150px auto auto -90px;background:#cfeaff}
body::after{width:220px;height:220px;inset:auto -70px -120px auto;background:#fff2b8}
::selection{background:#ffe78c;color:#17304f}
main{position:relative;z-index:1;width:min(920px,100%);display:grid;grid-template-columns:minmax(300px,.9fr) minmax(360px,1.1fr);overflow:hidden;border-radius:26px;background:#fff;box-shadow:var(--shadow)}
.hello{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:590px;padding:50px 46px;background:#2699e7;color:#fff;overflow:hidden}
.hello::after{content:"";position:absolute;width:210px;height:210px;right:-72px;bottom:-72px;border:34px solid rgba(255,255,255,.11);border-radius:50%}
.brand{position:relative;z-index:1}
.avatar{display:block;width:128px;height:128px;object-fit:cover;border-radius:30px;background:var(--yellow);box-shadow:0 18px 42px rgba(13,71,118,.28)}
h1{max-width:8ch;margin:28px 0 12px;font-size:clamp(2.25rem,5vw,3.35rem);line-height:1.04;letter-spacing:-.03em;text-wrap:balance}
.hello-copy{max-width:28ch;margin:0;color:#e4f4ff;font-size:1rem}
.steps{position:relative;z-index:1;display:grid;gap:12px;margin:34px 0 0;padding:0;list-style:none;color:#edf8ff;font-size:.91rem}
.steps li{display:flex;align-items:center;gap:10px}
.step-dot{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.17);font-size:.78rem;font-weight:800;font-variant-numeric:tabular-nums}
form{min-width:0;padding:clamp(34px,6vw,62px);display:grid;align-content:center;gap:18px;background:#fff}
.form-heading{display:grid;gap:7px;margin-bottom:3px}
h2{margin:0;color:var(--ink);font-size:clamp(1.55rem,4vw,2rem);line-height:1.2;letter-spacing:-.025em;text-wrap:balance}
.subheading{margin:0;color:var(--muted);font-size:.94rem}
.field{display:grid;gap:8px;min-width:0;color:#264b6d;font-weight:750}
.field-name{display:flex;align-items:center;justify-content:space-between;gap:12px}
.field-note{color:var(--muted);font-size:.78rem;font-weight:500}
input{width:100%;min-height:52px;padding:12px 14px;border:1px solid #bdd5e6;border-radius:13px;background:#fff;color:var(--ink);font:inherit;font-size:16px;caret-color:var(--blue-deep);transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}
input::placeholder{color:#91a6b8}
input:hover{border-color:#82bde4}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #9bd5fb;outline-offset:3px}
input:focus{border-color:var(--blue);box-shadow:0 0 0 4px #e4f5ff;background:var(--blue-pale)}
.code-input{min-height:62px;padding-inline:18px;text-align:center;font-family:ui-monospace,"SFMono-Regular",Consolas,monospace;font-size:1.45rem;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:.34em;text-indent:.34em}
.email-card{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:var(--blue-soft);color:#285677}
.mail-icon{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:12px;background:#fff;color:var(--blue-deep)}
.mail-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.email-card p{min-width:0;margin:0;font-size:.86rem;line-height:1.45}
.email-card strong{display:block;overflow-wrap:anywhere;color:var(--ink);font-size:.96rem;font-variant-numeric:tabular-nums}
.primary,.secondary{min-height:50px;border:0;border-radius:13px;font:inherit;font-weight:800;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease}
.primary{background:var(--blue);color:#fff;box-shadow:0 12px 26px rgba(47,158,233,.25)}
.primary:hover{background:#218ed8;transform:translateY(-1px);box-shadow:0 15px 30px rgba(47,158,233,.29)}
.primary:active{transform:translateY(0)}
.secondary{background:#edf6fc;color:#397398;box-shadow:none}
.secondary:hover:not(:disabled){background:#dff0fb}
.secondary:disabled{cursor:not-allowed;opacity:.68}
.notice{margin:0;padding:12px 14px;border-radius:13px;background:var(--danger-bg);color:var(--danger);font-size:.9rem;font-weight:650;overflow-wrap:anywhere}
.notice.success{background:var(--success-bg);color:var(--success)}
.help{margin:0;color:var(--muted);font-size:.82rem;line-height:1.65}
.help strong{color:#365f7f}
.resend-row{display:grid;grid-template-columns:1fr;gap:9px}
.noscript-link{color:var(--blue-deep);font-weight:750;text-underline-offset:3px}
@media(max-width:720px){body{display:block;padding:0;background:#fff}body::before,body::after{display:none}main{width:100%;min-height:100vh;grid-template-columns:1fr;border-radius:0;box-shadow:none}.hello{min-height:0;padding:24px 22px;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:16px}.hello::after{width:130px;height:130px;right:-45px;bottom:-70px;border-width:22px}.avatar{flex:0 0 74px;width:74px;height:74px;border-radius:20px}.brand{display:flex;align-items:center;gap:16px}.brand-text{min-width:0}h1{max-width:none;margin:0 0 4px;font-size:1.8rem}.hello-copy{font-size:.88rem}.steps{display:none}form{padding:34px 22px 40px;align-content:start;gap:17px}.code-input{font-size:1.32rem;letter-spacing:.27em;text-indent:.27em}}
@media(max-width:390px){.hello{padding-inline:18px}.avatar{flex-basis:64px;width:64px;height:64px;border-radius:18px}h1{font-size:1.62rem}form{padding-inline:18px}.field-name{align-items:flex-start;flex-direction:column;gap:2px}.code-input{letter-spacing:.2em;text-indent:.2em}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
""".strip()

LOGIN_PAGE_SCRIPT = """
(() => {
  const button = document.querySelector('[data-resend-button]');
  const status = document.querySelector('[data-resend-status]');
  if (!button || !status) return;
  const key = 'walineAiLoginResendAt';
  const duration = 60000;
  const now = Date.now();
  let deadline = Number(sessionStorage.getItem(key));
  if (!Number.isFinite(deadline) || deadline <= now || deadline > now + duration) {
    deadline = now + duration;
    sessionStorage.setItem(key, String(deadline));
  }
  let timer;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining > 0) {
      button.disabled = true;
      button.textContent = `重新获取验证码（${remaining}s）`;
      status.textContent = `${remaining} 秒后可以重新获取验证码`;
      timer = window.setTimeout(update, 250);
      return;
    }
    button.disabled = false;
    button.textContent = '重新获取验证码';
    status.textContent = '现在可以重新获取验证码';
  };
  button.addEventListener('click', () => {
    sessionStorage.removeItem(key);
    window.location.assign(button.dataset.loginUrl);
  });
  window.addEventListener('pagehide', () => window.clearTimeout(timer), { once: true });
  update();
})();
""".strip()
LOGIN_PAGE_SCRIPT_HASH = base64.b64encode(hashlib.sha256(LOGIN_PAGE_SCRIPT.encode("utf-8")).digest()).decode("ascii")

DASHBOARD_SCRIPT = """
(() => {
  const form = document.querySelector('[data-manual-reply-form]');
  if (!form) return;
  const textarea = form.querySelector('[data-reply-textarea]');
  const polishButton = form.querySelector('[data-polish-button]');
  const status = form.querySelector('[data-polish-status]');
  const csrfInput = form.querySelector('input[name="csrf"]');
  const commentInput = form.querySelector('input[name="comment_id"]');
  const preview = form.querySelector('[data-final-preview]');
  const previewButton = form.querySelector('[data-preview-button]');
  if (!textarea || !polishButton || !status || !csrfInput || !commentInput || !preview || !previewButton) return;
  const polishPath = '/ai-comment-admin/polish';
  const draftKey = 'walineAiManualReplyDraft';
  const disclaimer = form.dataset.disclaimer || '';

  const setStatus = (message, kind) => {
    status.textContent = message;
    status.className = 'polish-status' + (kind ? ' ' + kind : '');
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ commentId: commentInput.value, reply: textarea.value }));
    } catch (_error) {}
  };

  const markPreviewStale = () => {
    form.dataset.previewValue = '';
    preview.classList.add('stale');
  };

  const updatePreview = () => {
    const value = textarea.value.trim();
    preview.textContent = value ? value + (disclaimer ? '\\n\\n' + disclaimer : '') : '填写回复后，发布前会在这里显示最终公开内容。';
    form.dataset.previewValue = textarea.value;
    preview.classList.remove('stale');
    setStatus('预览已更新，请确认公开内容后再发布。', 'success');
  };

  try {
    const notice = document.querySelector('.notice:not(.error)');
    if (notice && notice.textContent.includes('已以小爱客服身份发布')) localStorage.removeItem(draftKey);
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (draft && !textarea.value && draft.reply) {
      commentInput.value = draft.commentId || '';
      textarea.value = draft.reply;
      markPreviewStale();
      setStatus('已恢复上次未发布草稿，请确认评论 ID。', 'success');
    }
  } catch (_error) {}

  form.querySelectorAll('[data-emoji]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.emoji || '';
      const start = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
      const end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
      textarea.value = textarea.value.slice(0, start) + value + textarea.value.slice(end);
      const caret = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
      saveDraft();
      markPreviewStale();
      setStatus('已插入表情，可继续编辑回复。', 'success');
    });
  });

  textarea.addEventListener('input', () => {
    saveDraft();
    markPreviewStale();
    if (status.classList.contains('success') || status.classList.contains('error')) setStatus('', '');
  });

  commentInput.addEventListener('input', saveDraft);
  previewButton.addEventListener('click', () => {
    if (!textarea.value.trim()) {
      setStatus('请先输入要发布的回复内容。', 'error');
      textarea.focus();
      return;
    }
    updatePreview();
  });

  form.addEventListener('submit', (event) => {
    if (form.dataset.previewValue !== textarea.value) {
      event.preventDefault();
      setStatus('请先点击“更新预览”，确认最终公开内容后再发布。', 'error');
      preview.classList.add('stale');
      preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  document.querySelectorAll('[data-template]').forEach((button) => {
    button.addEventListener('click', () => {
      textarea.value = button.dataset.template || '';
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      saveDraft();
      markPreviewStale();
      setStatus('已套用快捷模板，可继续替换细节。', 'success');
    });
  });

  document.querySelectorAll('[data-select-comment]').forEach((button) => {
    button.addEventListener('click', () => {
      commentInput.value = button.dataset.commentId || '';
      saveDraft();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      commentInput.focus();
      setStatus('已填入评论 ID，请检查回复内容后预览。', 'success');
    });
  });

  polishButton.addEventListener('click', async () => {
    if (!textarea.value.trim()) {
      setStatus('请先输入要润色的回复内容。', 'error');
      textarea.focus();
      return;
    }
    polishButton.disabled = true;
    polishButton.textContent = 'KIMI 正在润色…';
    setStatus('正在保留表情并整理语气，不会自动发布。', 'busy');
    const body = new URLSearchParams();
    body.set('csrf', csrfInput.value);
    body.set('reply', textarea.value);
    try {
      const response = await fetch(polishPath, {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      });
      let data = null;
      try {
        data = await response.json();
      } catch (_error) {
        data = null;
      }
      if (!response.ok || !data || !data.ok) {
        throw new Error(data && data.message ? data.message : '后台会话可能已过期，请刷新页面后重试。');
      }
      textarea.value = data.reply || '';
      saveDraft();
      markPreviewStale();
      setStatus('已完成 KIMI 润色，可继续修改后发布。', 'success');
      textarea.focus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '润色失败，请稍后重试。', 'error');
    } finally {
      polishButton.disabled = false;
      polishButton.textContent = 'KIMI AI 润色';
    }
  });
})();
""".strip()
DASHBOARD_SCRIPT_HASH = base64.b64encode(hashlib.sha256(DASHBOARD_SCRIPT.encode("utf-8")).digest()).decode("ascii")


@dataclass(frozen=True)
class AdminConfig:
	runtime_path: Path
	key_path: Path
	password_path: Path
	template_path: Path
	asset_root: Path
	origin: str
	smtp_path: Path = DEFAULT_SMTP_CONFIG_PATH
	session_path: Path = DEFAULT_SESSION_PATH
	reviewer_config_path: Path = DEFAULT_REVIEWER_CONFIG_PATH


@dataclass
class Session:
	csrf: str
	expires_at: float
	flash: tuple[str, bool] | None = None


@dataclass
class LoginChallenge:
	code_digest: str
	salt: str
	expires_at: float
	attempts_remaining: int


@dataclass(frozen=True)
class LoginCodeVerification:
	status: str
	attempts_remaining: int = 0


@dataclass(frozen=True)
class ReviewerConnection:
	waline_db_path: Path
	waline_base_url: str
	site_origin: str
	bot_nick: str
	bot_mail: str
	bot_link: str
	state_db_path: Path | None = None


def load_reviewer_connection(path: Path) -> ReviewerConnection:
	"""Load only the server-side values needed to publish a manual reply."""
	try:
		raw = json.loads(path.read_text(encoding="utf-8"))
	except FileNotFoundError:
		raise ValueError("评论连接配置尚未部署") from None
	except (OSError, UnicodeError, json.JSONDecodeError):
		raise ValueError("评论连接配置无法读取") from None
	if not isinstance(raw, dict):
		raise ValueError("评论连接配置格式无效")
	try:
		raw_db_path = raw["waline_db_path"]
		raw_base_url = raw["waline_base_url"]
		raw_site_origin = raw["site_origin"]
		if not isinstance(raw_db_path, str) or not raw_db_path.strip():
			raise ValueError
		if not isinstance(raw_base_url, str) or not raw_base_url.strip():
			raise ValueError
		if not isinstance(raw_site_origin, str) or not raw_site_origin.strip():
			raise ValueError
		db_path = Path(raw_db_path.strip())
		base_url = raw_base_url.strip().rstrip("/")
		site_origin = raw_site_origin.strip().rstrip("/")
		bot_nick = str(raw.get("bot_nick", "小爱客服")).strip()
		bot_mail = str(raw.get("bot_mail", "")).strip()
		bot_link = str(raw.get("bot_link", "")).strip()
		raw_state_path = raw.get("state_db_path")
		state_db_path = Path(raw_state_path.strip()) if isinstance(raw_state_path, str) and raw_state_path.strip() else None
	except (KeyError, TypeError, ValueError):
		raise ValueError("评论连接配置缺少必要字段") from None
	if not db_path:
		raise ValueError("Waline 数据库路径无效")
	base_parts = urllib.parse.urlsplit(base_url)
	origin_parts = urllib.parse.urlsplit(site_origin)
	if base_parts.scheme not in {"http", "https"} or not base_parts.netloc:
		raise ValueError("Waline 地址无效")
	if origin_parts.scheme != "https" or not origin_parts.netloc or origin_parts.path or origin_parts.query or origin_parts.fragment:
		raise ValueError("站点地址无效")
	if not bot_nick or not bot_mail or not bot_link:
		raise ValueError("小爱客服身份配置不完整")
	return ReviewerConnection(
		waline_db_path=db_path,
		waline_base_url=base_url,
		site_origin=site_origin,
		bot_nick=bot_nick,
		bot_mail=bot_mail,
		bot_link=bot_link,
		state_db_path=state_db_path,
	)


def resolve_state_db_path(reviewer_config_path: Path, fallback: Path) -> Path:
	try:
		raw = json.loads(reviewer_config_path.read_text(encoding="utf-8"))
		candidate = raw.get("state_db_path") if isinstance(raw, dict) else None
		if isinstance(candidate, str) and candidate.strip():
			return Path(candidate.strip())
	except (OSError, UnicodeError, json.JSONDecodeError):
		pass
	return fallback


class AuditStore:
	"""Shared SQLite audit/usage store used by the reviewer and admin console."""

	def __init__(self, path: Path) -> None:
		path.parent.mkdir(parents=True, exist_ok=True)
		self.path = path
		self.db = sqlite3.connect(path, check_same_thread=False)
		self.db.row_factory = sqlite3.Row
		self.db.execute("PRAGMA journal_mode=WAL")
		self.db.execute("PRAGMA busy_timeout=5000")
		self.db.executescript(
			"""
			CREATE TABLE IF NOT EXISTS meta (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS reply_events (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				created_at INTEGER NOT NULL,
				action TEXT NOT NULL,
				status TEXT NOT NULL,
				source_id INTEGER,
				reply_id INTEGER,
				source_nick TEXT,
				source_url TEXT,
				model TEXT,
				content TEXT,
				error TEXT,
				duration_ms INTEGER NOT NULL DEFAULT 0
			);
			CREATE INDEX IF NOT EXISTS idx_reply_events_created_at ON reply_events(created_at DESC);
			CREATE INDEX IF NOT EXISTS idx_reply_events_source_id ON reply_events(source_id, created_at DESC);
			""",
		)
		self.db.commit()
		self.lock = threading.RLock()

	def record(
		self,
		action: str,
		status: str,
		*,
		source_id: int | None = None,
		reply_id: int | None = None,
		source_nick: str = "",
		source_url: str = "",
		model: str = "",
		content: str = "",
		error: str = "",
		duration_ms: int = 0,
	) -> None:
		with self.lock:
			self.db.execute(
				"""
				INSERT INTO reply_events(
					created_at, action, status, source_id, reply_id, source_nick,
					source_url, model, content, error, duration_ms
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""",
				(
					int(time.time()), action[:40], status[:40], source_id, reply_id,
					source_nick[:120], source_url[:500], model[:160], content[:2000],
					error[:500], max(0, int(duration_ms)),
				),
			)
			self.db.commit()

	def recent(self, limit: int = 8, offset: int = 0) -> list[sqlite3.Row]:
		with self.lock:
			return list(self.db.execute(
				"SELECT * FROM reply_events ORDER BY id DESC LIMIT ? OFFSET ?",
				(max(1, min(limit, 100)), max(0, offset)),
			))

	def summary(self) -> dict[str, Any]:
		start = datetime.now(BEIJING).replace(hour=0, minute=0, second=0, microsecond=0)
		with self.lock:
			row = self.db.execute(
				"""
				SELECT
					COUNT(*) AS total,
					SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success,
					SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
					AVG(CASE WHEN status='success' AND duration_ms > 0 THEN duration_ms END) AS avg_duration
				FROM reply_events
				WHERE created_at >= ?
				""",
				(int(start.timestamp()),),
			).fetchone()
			last = self.db.execute(
				"SELECT * FROM reply_events ORDER BY id DESC LIMIT 1",
			).fetchone()
		return {
			"total": int(row["total"] or 0),
			"success": int(row["success"] or 0),
			"failed": int(row["failed"] or 0),
			"avg_duration_ms": int(row["avg_duration"] or 0),
			"last": last,
		}

	def meta(self, key: str) -> str | None:
		with self.lock:
			row = self.db.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
			return str(row["value"]) if row else None

	def close(self) -> None:
		with self.lock:
			self.db.close()


def open_waline_readonly(path: Path) -> sqlite3.Connection:
	try:
		uri = f"{path.resolve().as_uri()}?mode=ro"
		connection = sqlite3.connect(uri, uri=True, timeout=3.0)
		connection.row_factory = sqlite3.Row
		connection.execute("PRAGMA query_only=ON")
		connection.execute("PRAGMA busy_timeout=3000")
		return connection
	except (OSError, sqlite3.Error, ValueError):
		raise ValueError("无法读取 Waline 评论数据库，请稍后重试") from None


def load_recent_comments(connection_config: ReviewerConnection, limit: int = RECENT_COMMENT_LIMIT) -> list[sqlite3.Row]:
	connection = open_waline_readonly(connection_config.waline_db_path)
	try:
		try:
			rows = connection.execute(
				"""
				SELECT id, nick, comment, insertedAt, url, rid, pid, mail, status
				FROM wl_Comment
				WHERE status = 'approved'
				  AND lower(COALESCE(mail, '')) != lower(?)
				ORDER BY id DESC
				LIMIT ?
				""",
				(connection_config.bot_mail, max(1, min(limit, 100))),
			).fetchall()
		except sqlite3.Error:
			raise ValueError("无法读取 Waline 评论列表，请稍后重试") from None
		return list(rows)
	finally:
		connection.close()


def load_comment_for_reply(connection_config: ReviewerConnection, source_id: int) -> sqlite3.Row | None:
	connection = open_waline_readonly(connection_config.waline_db_path)
	try:
		try:
			return connection.execute(
				"""
				SELECT id, nick, comment, insertedAt, url, rid, pid, mail, status
				FROM wl_Comment
				WHERE id = ?
				LIMIT 1
				""",
				(source_id,),
			).fetchone()
		except sqlite3.Error:
			raise ValueError("无法读取目标评论，请稍后重试") from None
	finally:
		connection.close()


def load_comment_inbox(
	connection_config: ReviewerConnection,
	*,
	page: int = 1,
	query: str = "",
	status_filter: str = "all",
	reply_filter: str = "all",
	page_size: int = INBOX_PAGE_SIZE,
) -> tuple[list[sqlite3.Row], int, int]:
	page = max(1, page)
	page_size = max(5, min(page_size, 50))
	conditions = ["lower(COALESCE(source.mail, '')) != lower(?)"]
	params: list[Any] = [connection_config.bot_mail]
	if query:
		conditions.append("(source.nick LIKE ? OR source.comment LIKE ? OR source.url LIKE ?)")
		pattern = f"%{query[:80]}%"
		params.extend([pattern, pattern, pattern])
	if status_filter in {"approved", "waiting", "pending", "rejected"}:
		conditions.append("source.status = ?")
		params.append(status_filter)
	reply_exists = "EXISTS (SELECT 1 FROM wl_Comment bot_reply WHERE bot_reply.pid = source.id AND lower(COALESCE(bot_reply.mail, '')) = lower(?) AND lower(COALESCE(bot_reply.nick, '')) = lower(?))"
	if reply_filter == "replied":
		conditions.append(reply_exists)
		params.extend([connection_config.bot_mail, connection_config.bot_nick])
	elif reply_filter == "unreplied":
		conditions.append(f"NOT {reply_exists}")
		params.extend([connection_config.bot_mail, connection_config.bot_nick])
	where = " AND ".join(conditions)
	connection = open_waline_readonly(connection_config.waline_db_path)
	try:
		try:
			total_row = connection.execute(
				f"SELECT COUNT(*) AS count FROM wl_Comment source WHERE {where}",
				params,
			).fetchone()
			total = int(total_row["count"] if total_row else 0)
			page = min(page, max(1, math.ceil(total / page_size)))
			offset = (page - 1) * page_size
			rows = list(connection.execute(
				f"""
				SELECT source.id, source.nick, source.comment, source.insertedAt,
					source.url, source.status, source.rid, source.pid,
					CASE WHEN {reply_exists} THEN 1 ELSE 0 END AS has_bot_reply
				FROM wl_Comment source
				WHERE {where}
				ORDER BY source.id DESC
				LIMIT ? OFFSET ?
				""",
				[connection_config.bot_mail, connection_config.bot_nick, *params, page_size, offset],
			))
			return rows, total, page
		except sqlite3.Error:
			raise ValueError("无法读取评论收件箱，请稍后重试") from None
	finally:
		connection.close()


def load_existing_bot_reply(connection_config: ReviewerConnection, source_id: int) -> sqlite3.Row | None:
	connection = open_waline_readonly(connection_config.waline_db_path)
	try:
		try:
			return connection.execute(
				"""
				SELECT id, status FROM wl_Comment
				WHERE pid=? AND lower(COALESCE(mail, ''))=lower(?) AND lower(COALESCE(nick, ''))=lower(?)
				ORDER BY id ASC LIMIT 1
				""",
				(source_id, connection_config.bot_mail, connection_config.bot_nick),
			).fetchone()
		except sqlite3.Error:
			raise ValueError("无法确认评论是否已经回复") from None
	finally:
		connection.close()


def format_event_time(value: Any) -> str:
	try:
		return datetime.fromtimestamp(int(value), BEIJING).strftime("%m-%d %H:%M")
	except (TypeError, ValueError, OSError):
		return "—"


def format_age(value: Any) -> str:
	try:
		seconds = max(0, int(time.time()) - int(value))
		if seconds < 60:
			return f"{seconds} 秒前"
		if seconds < 3600:
			return f"{seconds // 60} 分钟前"
		if seconds < 86400:
			return f"{seconds // 3600} 小时前"
		return f"{seconds // 86400} 天前"
	except (TypeError, ValueError, OSError):
		return "暂无"


def render_inbox_rows(rows: list[sqlite3.Row]) -> str:
	if not rows:
		return '<tr><td colspan="6" class="empty-cell">没有符合条件的评论</td></tr>'
	status_labels = {"approved": "已通过", "waiting": "待审核", "pending": "待审核", "rejected": "已拒绝"}
	result: list[str] = []
	for row in rows:
		nick = html.escape(plain_text(str(row["nick"] or "访客"), 40))
		comment = html.escape(plain_text(str(row["comment"] or ""), 100))
		url = html.escape(normalize_path(row["url"]), quote=True)
		comment_id = html.escape(str(row["id"]), quote=True)
		status = html.escape(status_labels.get(str(row["status"]), str(row["status"])))
		replied = bool(row["has_bot_reply"])
		reply_label = "已回复" if replied else "未回复"
		result.append(
			f'<tr><td><strong>#{comment_id}</strong><span class="table-sub">{nick}</span></td>'
			f'<td><span class="comment-excerpt">{comment or "（无文字内容）"}</span><span class="table-sub">{url}</span></td>'
			f'<td><span class="pill">{status}</span></td><td><span class="pill {"pill-success" if replied else "pill-muted"}">{reply_label}</span></td>'
			f'<td>{format_event_time(row["insertedAt"])}</td>'
			f'<td><button class="table-action" type="button" data-select-comment data-comment-id="{comment_id}">填入回复</button></td></tr>'
		)
	return "".join(result)


def render_pagination(page: int, total: int, query: str, status_filter: str, reply_filter: str) -> str:
	pages = max(1, (total + INBOX_PAGE_SIZE - 1) // INBOX_PAGE_SIZE)
	if pages <= 1:
		return f'<span class="pagination-note">共 {total} 条</span>'
	params = {"q": query, "comment_status": status_filter, "reply_state": reply_filter}
	links: list[str] = [f'<span class="pagination-note">第 {page}/{pages} 页 · 共 {total} 条</span>']
	for target, label in ((max(1, page - 1), "上一页"), (min(pages, page + 1), "下一页")):
		if target == page:
			continue
		params["page"] = str(target)
		query_string = urllib.parse.urlencode({key: value for key, value in params.items() if value and value != "all"})
		links.append(f'<a class="page-link" href="{DASHBOARD_PATH}?{html.escape(query_string, quote=True)}">{label}</a>')
	return "".join(links)


def health_card(title: str, value: str, detail: str, tone: str = "") -> str:
	return (
		f'<article class="status-card {html.escape(tone, quote=True)}">'
		f'<span class="status-label">{html.escape(title)}</span>'
		f'<strong>{html.escape(value)}</strong>'
		f'<span class="status-detail">{html.escape(detail)}</span></article>'
	)


def reviewer_health(
	connection_config: ReviewerConnection | None,
	runtime: dict[str, Any],
	key_path: Path,
	audit: AuditStore,
) -> str:
	meta = {key: audit.meta(key) for key in (
		"last_cycle_at", "last_ai_success_at", "last_reply_at", "last_cycle_error",
		"reviewer_version", "runtime_enabled", "runtime_model", "runtime_mode",
	)}
	cycle_at = int(meta.get("last_cycle_at") or 0)
	if not cycle_at:
		worker_value, worker_detail, worker_tone = "未启动", "还没有检测到处理心跳", "warning"
	elif time.time() - cycle_at <= 180:
		worker_value, worker_detail, worker_tone = "运行中", f'最近心跳 {format_age(cycle_at)}', "success"
	else:
		worker_value, worker_detail, worker_tone = "可能离线", f'最近心跳 {format_age(cycle_at)}', "warning"
	if meta.get("last_cycle_error"):
		worker_detail = str(meta["last_cycle_error"])
		worker_tone = "danger"

	if connection_config is None:
		waline_value, waline_detail, waline_tone = "未连接", "请检查评论连接配置", "danger"
	else:
		try:
			connection = open_waline_readonly(connection_config.waline_db_path)
			try:
				connection.execute("SELECT 1 FROM wl_Comment LIMIT 1").fetchone()
			finally:
				connection.close()
			waline_value, waline_detail, waline_tone = "可读", "Waline 评论库连接正常", "success"
		except (OSError, ValueError, sqlite3.Error):
			waline_value, waline_detail, waline_tone = "异常", "无法读取 wl_Comment", "danger"

	key_ready = key_path.is_file() and key_path.stat().st_size > 1
	if not key_ready:
		provider_value, provider_detail, provider_tone = "未配置", "请先设置 SiliconFlow API Key", "warning"
	elif meta.get("last_ai_success_at"):
		provider_value = "可用"
		provider_detail = f'最近成功 {format_age(meta["last_ai_success_at"])}'
		provider_tone = "success"
	else:
		provider_value, provider_detail, provider_tone = "待调用", "密钥已配置，尚无成功记录", "warning"

	rule_count = sum(len(runtime.get("rules", {}).get(key, [])) for key in ("allowed_paths", "blocked_paths", "ignored_keywords"))
	return "".join((
		health_card("自动回复进程", worker_value, worker_detail, worker_tone),
		health_card("Waline 评论库", waline_value, waline_detail, waline_tone),
		health_card("AI 服务", provider_value, provider_detail, provider_tone),
		health_card("当前策略", "已启用" if runtime["enabled"] else "已暂停", f'{runtime["model"]} · {rule_count} 条规则', "success" if runtime["enabled"] else "warning"),
	))


def event_action_label(action: str) -> str:
	return {
		"auto_reply": "自动回复",
		"auto_reply_fallback": "兜底回复",
		"auto_rule": "规则判断",
		"manual_reply": "手动回复",
		"polish": "KIMI 润色",
	}.get(action, action or "未知操作")


def event_status_label(status: str) -> str:
	return {
		"success": "成功",
		"failed": "失败",
		"ignored": "已忽略",
		"deferred": "已延后",
	}.get(status, status or "未知")


def render_event_rows(rows: list[sqlite3.Row]) -> str:
	if not rows:
		return '<tr><td colspan="6" class="empty-cell">还没有审计记录</td></tr>'
	result: list[str] = []
	for row in rows:
		action = event_action_label(str(row["action"] or ""))
		status = str(row["status"] or "")
		tone = "pill-success" if status == "success" else "pill-danger" if status == "failed" else "pill-muted"
		content = plain_text(str(row["content"] or row["error"] or ""), 90)
		if row["error"] and status == "failed":
			content = f"{content} · {plain_text(str(row['error']), 90)}"
		source = f'#{row["source_id"]}' if row["source_id"] else "—"
		result.append(
			f'<tr><td>{html.escape(format_event_time(row["created_at"]))}</td>'
			f'<td><strong>{html.escape(action)}</strong><span class="table-sub">{html.escape(source)}</span></td>'
			f'<td><span class="pill {tone}">{html.escape(event_status_label(status))}</span></td>'
			f'<td>{html.escape(str(row["model"] or "—"))}</td>'
			f'<td class="event-content">{html.escape(content or "—")}</td>'
			f'<td>{html.escape(str(row["duration_ms"] or 0))} ms</td></tr>'
		)
	return "".join(result)


def render_usage(summary: dict[str, Any]) -> str:
	return (
		f'<div class="metric-grid">'
		f'<div class="metric"><strong>{summary["total"]}</strong><span>今日操作</span></div>'
		f'<div class="metric"><strong>{summary["success"]}</strong><span>成功</span></div>'
		f'<div class="metric"><strong>{summary["failed"]}</strong><span>失败</span></div>'
		f'<div class="metric"><strong>{summary["avg_duration_ms"]} ms</strong><span>平均耗时</span></div>'
		f'</div>'
	)


def render_comment_options(rows: list[sqlite3.Row]) -> str:
	options: list[str] = []
	for row in rows:
		nick = plain_text(str(row["nick"] or "访客"), 32) or "访客"
		excerpt = plain_text(str(row["comment"] or ""), 90) or "（无文字内容）"
		path = normalize_path(row["url"])
		label = f"{nick} · {excerpt} · {path}"
		options.append(
			f'<option value="{html.escape(str(row["id"]), quote=True)}" label="{html.escape(label, quote=True)}"></option>'
		)
	return "".join(options) or '<option value="" label="暂无已审核评论"></option>'


def build_manual_reply_payload(
	row: sqlite3.Row | dict[str, Any],
	connection_config: ReviewerConnection,
	public_reply: str,
) -> dict[str, Any]:
	source_id = int(row["id"])
	root_id = int(row["rid"] or source_id)
	return {
		"nick": connection_config.bot_nick,
		"mail": connection_config.bot_mail,
		"link": connection_config.bot_link,
		"comment": public_reply[:MAX_PUBLIC_REPLY_CHARS],
		"url": normalize_path(row["url"]),
		"ua": f"Rainzt-Waline-AI-Admin/{BOT_VERSION}",
		"pid": source_id,
		"rid": root_id,
		"at": str(row["nick"] or "访客")[:40],
	}


class PolishProviderError(RuntimeError):
	"""Raised when the server-side KIMI polish request cannot be completed."""


def normalize_reply_draft(text: str, *, empty_message: str = "请先输入回复内容") -> str:
	"""Normalize a draft without removing emoji, kaomoji, or intentional line breaks."""
	clean = text.replace("\r\n", "\n").replace("\r", "\n").strip()
	if not clean:
		raise ValueError(empty_message)
	if len(clean) > MANUAL_REPLY_MAX_CHARS:
		raise ValueError(f"回复正文最多 {MANUAL_REPLY_MAX_CHARS} 个字符，以便保留身份说明")
	return clean


POLISH_SYSTEM_PROMPT = (
	"你是朝朝听雨博客的小爱客服回复润色助手。"
	"请把站长草稿润色成自然、温柔、清晰、带一点轻快 AI 客服感的中文，保留原意和语气，避免过度像正式人工书信。"
	"不要冒充站长，不增加草稿中没有的事实、承诺或观点。"
	"不要输出 @昵称（Waline 会自动显示被回复者）。"
	"必须保留草稿里的所有 emoji、颜文字、特殊符号和换行语义，不要把 emoji 改成文字。"
	"只输出可以直接发布的回复正文，不要引号、Markdown、HTML、解释、标题或思考过程。"
	"不要附加 AI 免责声明，服务器会统一添加。"
	+ f"长度控制在 {MANUAL_REPLY_MAX_CHARS} 个字符以内。"
)


def polish_manual_reply(text: str, key_path: Path, timeout: float = 45.0) -> str:
	"""Polish a manual reply through the server-only SiliconFlow KIMI endpoint."""
	draft = normalize_reply_draft(text, empty_message="请先输入要润色的回复内容")
	try:
		api_key = key_path.read_text(encoding="utf-8").strip()
	except OSError:
		raise ValueError("无法读取 SiliconFlow API Key") from None
	if not api_key:
		raise ValueError("尚未配置 SiliconFlow API Key")
	payload = {
		"model": POLISH_MODEL,
		"messages": [
			{"role": "system", "content": POLISH_SYSTEM_PROMPT},
			{"role": "user", "content": "站长草稿：\n" + draft},
		],
		"stream": False,
		"enable_thinking": False,
		"max_tokens": 256,
		"temperature": 0.55,
	}
	request = urllib.request.Request(
		SILICONFLOW_ENDPOINT,
		data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
		headers={
			"Authorization": f"Bearer {api_key}",
			"Content-Type": "application/json",
			"User-Agent": f"Rainzt-Waline-AI-Admin/{BOT_VERSION}",
		},
		method="POST",
	)
	try:
		with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
			body = response.read(256 * 1024)
			status = getattr(response, "status", HTTPStatus.OK)
	except urllib.error.HTTPError as error:
		raise PolishProviderError(f"KIMI 请求失败（HTTP {error.code}），请稍后重试") from None
	except (urllib.error.URLError, TimeoutError, OSError):
		raise PolishProviderError("暂时无法连接 KIMI，请稍后重试") from None
	if status != HTTPStatus.OK:
		raise PolishProviderError(f"KIMI 请求失败（HTTP {status}），请稍后重试")
	try:
		result = json.loads(body.decode("utf-8"))
		message = ((result.get("choices") or [{}])[0].get("message") or {})
		reply = str(message.get("content") or "")
	except (AttributeError, IndexError, KeyError, TypeError, ValueError, UnicodeDecodeError):
		raise PolishProviderError("KIMI 返回格式异常，请稍后重试") from None
	reply = re.sub(r"<think>[\s\S]*?</think>", "", reply, flags=re.IGNORECASE).strip()
	reply = reply.strip("` \n\r\t")
	if reply.endswith(MANUAL_REPLY_DISCLAIMER):
		reply = reply[: -len(MANUAL_REPLY_DISCLAIMER)].rstrip()
	if not reply:
		raise PolishProviderError("KIMI 没有返回可用内容，请稍后重试")
	return reply[:MANUAL_REPLY_MAX_CHARS]


def make_manual_reply(text: str) -> str:
	clean = normalize_reply_draft(text)
	return f"{clean}\n\n{MANUAL_REPLY_DISCLAIMER}"


def publish_manual_reply(
	row: sqlite3.Row,
	connection_config: ReviewerConnection,
	public_reply: str,
	timeout: float = 20.0,
) -> tuple[int | None, str | None]:
	payload = build_manual_reply_payload(row, connection_config, public_reply)
	path = str(payload["url"])
	request = urllib.request.Request(
		f"{connection_config.waline_base_url}/api/comment?lang=zh-CN",
		data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
		headers={
			"Content-Type": "application/json",
			"Origin": connection_config.site_origin,
			"Referer": f"{connection_config.site_origin}{path}",
			"User-Agent": f"Rainzt-Waline-AI-Admin/{BOT_VERSION}",
		},
		method="POST",
	)
	try:
		with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
			body = response.read(256 * 1024)
	except urllib.error.HTTPError as error:
		raise ValueError(f"Waline 返回 HTTP {error.code}，评论可能未发布") from None
	except (urllib.error.URLError, TimeoutError, OSError):
		raise ValueError("无法连接 Waline，评论可能未发布") from None
	try:
		result = json.loads(body.decode("utf-8"))
	except (UnicodeDecodeError, json.JSONDecodeError):
		raise ValueError("Waline 响应格式异常，无法确认发布结果") from None
	if not isinstance(result, dict):
		raise ValueError("Waline 响应格式异常，无法确认发布结果")
	if result.get("errno") not in {None, 0, "0"}:
		raise ValueError(f"Waline 拒绝了回复：{str(result.get('errmsg') or result.get('errno'))[:160]}")
	comment = result.get("data") if isinstance(result.get("data"), dict) else result
	try:
		reply_id = int(comment["objectId"]) if comment.get("objectId") else None
	except (KeyError, TypeError, ValueError):
		reply_id = None
	reply_status = str(comment.get("status")) if comment.get("status") else None
	return reply_id, reply_status


class LoginChallengeStore:
	def __init__(self) -> None:
		self._challenges: dict[str, LoginChallenge] = {}
		self._lock = threading.Lock()

	def create(self, code: str) -> str:
		if len(code) != 6 or not code.isascii() or not code.isdigit():
			raise ValueError("login code must contain exactly six ASCII digits")
		with self._lock:
			self._purge_locked()
			challenge_id = secrets.token_urlsafe(32)
			salt = secrets.token_hex(16)
			self._challenges[challenge_id] = LoginChallenge(
				code_digest=self._digest(salt, code),
				salt=salt,
				expires_at=time.time() + LOGIN_CODE_SECONDS,
				attempts_remaining=LOGIN_CODE_ATTEMPTS,
			)
			return challenge_id

	def verify(self, challenge_id: str | None, code: str) -> LoginCodeVerification:
		if not challenge_id:
			return LoginCodeVerification("missing")
		with self._lock:
			challenge = self._challenges.get(challenge_id)
			if not challenge:
				return LoginCodeVerification("missing")
			if challenge.expires_at <= time.time():
				self._challenges.pop(challenge_id, None)
				return LoginCodeVerification("expired")
			candidate = self._digest(challenge.salt, code)
			if secrets.compare_digest(challenge.code_digest, candidate):
				self._challenges.pop(challenge_id, None)
				return LoginCodeVerification("verified")
			challenge.attempts_remaining -= 1
			if challenge.attempts_remaining <= 0:
				self._challenges.pop(challenge_id, None)
				return LoginCodeVerification("locked")
			return LoginCodeVerification("invalid", challenge.attempts_remaining)

	def delete(self, challenge_id: str | None) -> None:
		if not challenge_id:
			return
		with self._lock:
			self._challenges.pop(challenge_id, None)

	def _purge_locked(self) -> None:
		now = time.time()
		for challenge_id in [key for key, value in self._challenges.items() if value.expires_at <= now]:
			self._challenges.pop(challenge_id, None)

	@staticmethod
	def _digest(salt: str, code: str) -> str:
		return hashlib.sha256(f"{salt}:{code}".encode("ascii", errors="ignore")).hexdigest()


class SessionStore:
	def __init__(self, path: Path) -> None:
		self.path = path
		self._sessions: dict[str, Session] = {}
		self._lock = threading.Lock()
		with self._lock:
			needs_rewrite = self._load_locked()
			if self._purge_locked():
				needs_rewrite = True
			if needs_rewrite and self.path.exists():
				self._persist_locked()
			if self.path.exists():
				os.chmod(self.path, 0o600)

	def create(self) -> tuple[str, Session]:
		with self._lock:
			self._purge_locked()
			session_id = secrets.token_urlsafe(32)
			session = Session(secrets.token_urlsafe(32), time.time() + SESSION_SECONDS)
			self._sessions[session_id] = session
			self._persist_locked()
			return session_id, session

	def get(self, session_id: str | None) -> Session | None:
		if not session_id:
			return None
		with self._lock:
			if self._purge_locked():
				self._persist_locked()
			session = self._sessions.get(session_id)
			return session

	def set_flash(self, session_id: str, message: str, is_error: bool = False) -> None:
		with self._lock:
			session = self._sessions.get(session_id)
			if session:
				session.flash = (message, is_error)
				self._persist_locked()

	def pop_flash(self, session_id: str) -> tuple[str, bool] | None:
		with self._lock:
			session = self._sessions.get(session_id)
			if not session:
				return None
			flash = session.flash
			session.flash = None
			if flash is not None:
				self._persist_locked()
			return flash

	def delete(self, session_id: str | None) -> None:
		if not session_id:
			return
		with self._lock:
			if self._sessions.pop(session_id, None) is not None:
				self._persist_locked()

	def delete_all(self) -> None:
		with self._lock:
			if self._sessions:
				self._sessions.clear()
				self._persist_locked()

	def _load_locked(self) -> bool:
		try:
			raw = json.loads(self.path.read_text(encoding="utf-8"))
		except FileNotFoundError:
			return False
		except (OSError, UnicodeError, json.JSONDecodeError):
			LOG.error("persistent admin session file could not be loaded; all saved sessions were rejected")
			return True
		if not isinstance(raw, dict):
			LOG.error("persistent admin session file has an invalid root; all saved sessions were rejected")
			return True
		needs_rewrite = False
		for session_id, value in raw.items():
			try:
				session = self._decode_session(session_id, value)
			except (TypeError, ValueError):
				needs_rewrite = True
				continue
			self._sessions[session_id] = session
		return needs_rewrite

	@staticmethod
	def _decode_session(session_id: Any, value: Any) -> Session:
		if not isinstance(session_id, str) or not 32 <= len(session_id) <= 128:
			raise ValueError("invalid session id")
		if any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in session_id):
			raise ValueError("invalid session id")
		if not isinstance(value, dict):
			raise ValueError("invalid session record")
		csrf = value.get("csrf")
		if not isinstance(csrf, str) or not 32 <= len(csrf) <= 128:
			raise ValueError("invalid csrf token")
		if any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in csrf):
			raise ValueError("invalid csrf token")
		expires_at = float(value.get("expires_at"))
		if not math.isfinite(expires_at) or expires_at <= 0:
			raise ValueError("invalid session expiry")
		flash_value = value.get("flash")
		flash: tuple[str, bool] | None = None
		if flash_value is not None:
			if (
				not isinstance(flash_value, list)
				or len(flash_value) != 2
				or not isinstance(flash_value[0], str)
				or len(flash_value[0]) > 4096
				or not isinstance(flash_value[1], bool)
			):
				raise ValueError("invalid session flash")
			flash = (flash_value[0], flash_value[1])
		return Session(csrf=csrf, expires_at=expires_at, flash=flash)

	def _persist_locked(self) -> None:
		payload = {
			session_id: {
				"csrf": session.csrf,
				"expires_at": session.expires_at,
				"flash": list(session.flash) if session.flash is not None else None,
			}
			for session_id, session in self._sessions.items()
		}
		atomic_write(
			self.path,
			(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"),
			mode=0o600,
		)

	def _purge_locked(self) -> bool:
		now = time.time()
		expired = [key for key, value in self._sessions.items() if value.expires_at <= now]
		for session_id in expired:
			self._sessions.pop(session_id, None)
		return bool(expired)


class LoginRateLimiter:
	def __init__(self, maximum: int = 5, window_seconds: int = 15 * 60) -> None:
		self.maximum = maximum
		self.window_seconds = window_seconds
		self._failures: dict[str, list[float]] = {}
		self._lock = threading.Lock()

	def retry_after(self, address: str) -> int:
		with self._lock:
			attempts = self._recent_locked(address)
			if len(attempts) < self.maximum:
				return 0
			return max(1, int(attempts[0] + self.window_seconds - time.time()) + 1)

	def begin(self, address: str) -> int:
		"""Reserve one attempt atomically, returning a retry delay when locked."""
		with self._lock:
			attempts = self._recent_locked(address)
			if len(attempts) >= self.maximum:
				return max(1, int(attempts[0] + self.window_seconds - time.time()) + 1)
			attempts.append(time.time())
			self._failures[address] = attempts
			return 0

	def fail(self, address: str) -> None:
		with self._lock:
			attempts = self._recent_locked(address)
			attempts.append(time.time())
			self._failures[address] = attempts

	def succeed(self, address: str) -> None:
		with self._lock:
			self._failures.pop(address, None)

	def _recent_locked(self, address: str) -> list[float]:
		cutoff = time.time() - self.window_seconds
		attempts = [value for value in self._failures.get(address, []) if value > cutoff]
		if attempts:
			self._failures[address] = attempts
		else:
			self._failures.pop(address, None)
		return attempts


class LoginCodeSendLimiter:
	def __init__(
		self,
		maximum: int = LOGIN_CODE_SEND_MAXIMUM,
		window_seconds: int = LOGIN_CODE_SEND_WINDOW_SECONDS,
		cooldown_seconds: int = LOGIN_CODE_SEND_COOLDOWN_SECONDS,
	) -> None:
		self.maximum = maximum
		self.window_seconds = window_seconds
		self.cooldown_seconds = cooldown_seconds
		self._sends: dict[str, list[float]] = {}
		self._lock = threading.Lock()

	def reserve(self, address: str) -> int:
		with self._lock:
			now = time.time()
			sends = self._recent_locked(address, now)
			if sends and now - sends[-1] < self.cooldown_seconds:
				return max(1, int(sends[-1] + self.cooldown_seconds - now) + 1)
			if len(sends) >= self.maximum:
				return max(1, int(sends[0] + self.window_seconds - now) + 1)
			sends.append(now)
			self._sends[address] = sends
			return 0

	def release_latest(self, address: str) -> None:
		with self._lock:
			sends = self._recent_locked(address, time.time())
			if sends:
				sends.pop()
			if sends:
				self._sends[address] = sends
			else:
				self._sends.pop(address, None)

	def _recent_locked(self, address: str, now: float) -> list[float]:
		cutoff = now - self.window_seconds
		sends = [value for value in self._sends.get(address, []) if value > cutoff]
		if sends:
			self._sends[address] = sends
		else:
			self._sends.pop(address, None)
		return sends


class AdminApplication:
	def __init__(self, config: AdminConfig) -> None:
		self.config = config
		self.sessions = SessionStore(config.session_path)
		self.login_limiter = LoginRateLimiter()
		self.login_challenges = LoginChallengeStore()
		self.login_code_send_limiter = LoginCodeSendLimiter()
		self.login_code_sender = send_login_code
		self.template = Template(config.template_path.read_text(encoding="utf-8"))
		state_path = resolve_state_db_path(
			config.reviewer_config_path,
			config.runtime_path.with_name("admin-state.sqlite"),
		)
		self.audit = AuditStore(state_path)

	def close(self) -> None:
		self.audit.close()


def load_smtp_config(path: Path) -> dict[str, Any]:
	try:
		raw = json.loads(path.read_text(encoding="utf-8"))
	except FileNotFoundError:
		raise ValueError("SMTP 配置不存在") from None
	if not isinstance(raw, dict):
		raise ValueError("SMTP 配置必须是 JSON 对象")
	for key in ("host", "user", "password"):
		if not isinstance(raw.get(key), str) or not raw[key].strip():
			raise ValueError(f"SMTP 配置缺少 {key}")
	try:
		port = int(raw.get("port") or 465)
	except (TypeError, ValueError):
		raise ValueError("SMTP 端口无效") from None
	if not 1 <= port <= 65535:
		raise ValueError("SMTP 端口无效")
	secure = str(raw.get("secure", "true")).lower() in {"1", "true", "yes"}
	sender_email = raw.get("sender_email") or raw["user"]
	if not isinstance(sender_email, str) or not sender_email.strip():
		raise ValueError("SMTP 发件地址无效")
	return {
		"host": raw["host"].strip(),
		"port": port,
		"secure": secure,
		"user": raw["user"].strip(),
		"password": raw["password"],
		"sender_email": sender_email.strip(),
	}


def send_login_code(smtp_path: Path, recipient: str, code: str) -> None:
	if not secrets.compare_digest(recipient, LOGIN_CODE_RECIPIENT):
		raise ValueError("登录验证码收件地址不受允许")
	if len(code) != 6 or not code.isascii() or not code.isdigit():
		raise ValueError("登录验证码格式无效")
	smtp = load_smtp_config(smtp_path)
	message = EmailMessage()
	message["Subject"] = "小爱客服后台登录验证码"
	message["From"] = smtp["sender_email"]
	message["To"] = LOGIN_CODE_RECIPIENT
	message.set_content(
		"您正在登录小爱客服后台。\n\n"
		f"本次验证码：{code}\n\n"
		"验证码 10 分钟内有效，最多可尝试 5 次。若非本人操作，请忽略本邮件。\n"
	)
	context = ssl.create_default_context()
	client: smtplib.SMTP
	if smtp["secure"]:
		client = smtplib.SMTP_SSL(smtp["host"], smtp["port"], timeout=20, context=context)
	else:
		client = smtplib.SMTP(smtp["host"], smtp["port"], timeout=20)
		client.ehlo()
		client.starttls(context=context)
		client.ehlo()
	try:
		client.login(smtp["user"], smtp["password"])
		client.send_message(message)
	finally:
		try:
			client.quit()
		except (OSError, smtplib.SMTPException):
			pass


def masked_login_email() -> str:
	local, domain = LOGIN_CODE_RECIPIENT.split("@", 1)
	visible = local[:3] + "*" * max(4, len(local) - 5) + local[-2:]
	return f"{visible}@{domain}"


def rule_lines(value: Any) -> list[str]:
	if isinstance(value, str):
		values = value.splitlines()
	elif isinstance(value, (list, tuple)):
		values = list(value)
	else:
		values = []
	return [str(item).strip()[:80] for item in values if str(item).strip()]


def normalize_runtime_rules(value: Any) -> dict[str, Any]:
	rules = value if isinstance(value, dict) else {}
	allowed_paths = [path for path in rule_lines(rules.get("allowed_paths")) if path.startswith("/")]
	blocked_paths = [path for path in rule_lines(rules.get("blocked_paths")) if path.startswith("/")]
	ignored_keywords = rule_lines(rules.get("ignored_keywords"))
	quiet_start = str(rules.get("quiet_start") or "").strip()
	quiet_end = str(rules.get("quiet_end") or "").strip()
	if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", quiet_start):
		quiet_start = ""
	if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", quiet_end):
		quiet_end = ""
	try:
		daily_limit = max(0, min(10000, int(rules.get("daily_limit", 0))))
	except (TypeError, ValueError):
		daily_limit = 0
	return {
		"allowed_paths": allowed_paths,
		"blocked_paths": blocked_paths,
		"ignored_keywords": ignored_keywords,
		"quiet_start": quiet_start,
		"quiet_end": quiet_end,
		"daily_limit": daily_limit,
	}


def load_runtime(path: Path) -> dict[str, Any]:
	try:
		raw = json.loads(path.read_text(encoding="utf-8"))
	except FileNotFoundError:
		raw = {}
	if not isinstance(raw, dict):
		raise ValueError("runtime.json 必须是 JSON 对象")
	model = str(raw.get("model") or ALLOWED_MODELS[0])
	if model not in ALLOWED_MODELS:
		raise ValueError("runtime.json 使用了后台不允许的模型")
	temperature = float(raw.get("temperature", 0.55))
	if not 0 <= temperature <= 1.5:
		raise ValueError("温度必须在 0 到 1.5 之间")
	return {
		"enabled": bool(raw.get("enabled", True)),
		"model": model,
		"thinking": bool(raw.get("thinking", False)),
		"temperature": temperature,
		"rules": normalize_runtime_rules(raw.get("rules")),
	}


def save_runtime(path: Path, settings: dict[str, Any]) -> None:
	model = str(settings.get("model", ""))
	if model not in ALLOWED_MODELS:
		raise ValueError("不允许使用该模型")
	temperature = float(settings["temperature"])
	if not 0 <= temperature <= 1.5:
		raise ValueError("温度必须在 0 到 1.5 之间")
	payload = {
		"enabled": bool(settings["enabled"]),
		"model": model,
		"thinking": bool(settings["thinking"]),
		"temperature": temperature,
		"rules": normalize_runtime_rules(settings.get("rules")),
	}
	atomic_write(path, (json.dumps(payload, ensure_ascii=False, indent="\t") + "\n").encode("utf-8"))


def replace_api_key(path: Path, value: str) -> None:
	if not 12 <= len(value) <= 512 or value != value.strip() or any(character.isspace() for character in value):
		raise ValueError("API Key 格式无效，请粘贴完整且不含空白的密钥")
	atomic_write(path, (value + "\n").encode("utf-8"))


def probe_siliconflow(runtime: dict[str, Any], key_path: Path, timeout: float = 12.0) -> float:
	key = key_path.read_text(encoding="utf-8").strip()
	if not key:
		raise ValueError("尚未配置 SiliconFlow API Key")
	payload = json.dumps({
		"model": runtime["model"],
		"messages": [{"role": "user", "content": "只回复 OK"}],
		"stream": False,
		"enable_thinking": bool(runtime["thinking"]),
		"max_tokens": 8,
		"temperature": min(float(runtime["temperature"]), 0.2),
	}, ensure_ascii=False).encode("utf-8")
	request = urllib.request.Request(
		SILICONFLOW_ENDPOINT,
		data=payload,
		headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
		method="POST",
	)
	started = time.monotonic()
	try:
		with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
			body = response.read(256 * 1024)
			if response.status != HTTPStatus.OK:
				raise ValueError(f"SiliconFlow 返回 HTTP {response.status}")
	except urllib.error.HTTPError as error:
		raise ValueError(f"SiliconFlow 返回 HTTP {error.code}，请检查密钥与模型权限") from None
	except (urllib.error.URLError, TimeoutError, OSError):
		raise ValueError("无法连接 SiliconFlow，请检查服务器网络后重试") from None
	try:
		decoded = json.loads(body.decode("utf-8"))
		message = decoded["choices"][0]["message"]
		if not isinstance(message, dict):
			raise TypeError
	except (KeyError, IndexError, TypeError, ValueError, UnicodeDecodeError):
		raise ValueError("SiliconFlow 响应格式异常") from None
	return time.monotonic() - started


class AdminHTTPServer(ThreadingHTTPServer):
	daemon_threads = True
	allow_reuse_address = True

	def __init__(self, address: tuple[str, int], application: AdminApplication) -> None:
		super().__init__(address, AdminHandler)
		self.application = application

	def server_close(self) -> None:
		super().server_close()
		self.application.close()


class AdminHandler(BaseHTTPRequestHandler):
	server: AdminHTTPServer
	server_version = "WalineAIAdmin/1.0"
	sys_version = ""

	def do_GET(self) -> None:
		parsed = urllib.parse.urlsplit(self.path)
		path = parsed.path
		if path == AVATAR_PATH:
			self._serve_avatar()
			return
		if path == BASE_PATH:
			self._redirect(DASHBOARD_PATH)
			return
		if path == LOGIN_PATH:
			if self._current_session()[1]:
				self._redirect(DASHBOARD_PATH)
			else:
				self._serve_login()
			return
		if path != DASHBOARD_PATH:
			self._send_text(HTTPStatus.NOT_FOUND, "页面不存在")
			return
		session_id, session = self._current_session()
		if not session:
			self._redirect(LOGIN_PATH)
			return
		self._serve_dashboard(session_id or "", session, urllib.parse.parse_qs(parsed.query))

	def do_POST(self) -> None:
		path = urllib.parse.urlsplit(self.path).path
		if not self._origin_matches():
			self._send_text(HTTPStatus.FORBIDDEN, "来源校验失败，请从后台页面重新操作")
			return
		try:
			form = self._read_form()
		except ValueError as error:
			self._send_text(HTTPStatus.BAD_REQUEST, str(error))
			return
		if path == LOGIN_PATH:
			self._login(form)
			return
		session_id, session = self._current_session()
		if not session_id or not session:
			self._redirect(LOGIN_PATH)
			return
		if not secrets.compare_digest(form.get("csrf", ""), session.csrf):
			self._send_text(HTTPStatus.FORBIDDEN, "CSRF 校验失败，请刷新页面后重试")
			return
		if path == f"{BASE_PATH}/settings":
			self._update_settings(session_id, form)
		elif path == f"{BASE_PATH}/key":
			self._update_key(session_id, form)
		elif path == f"{BASE_PATH}/test":
			self._test_provider(session_id)
		elif path == f"{BASE_PATH}/reply":
			self._manual_reply(session_id, form)
		elif path == POLISH_PATH:
			self._polish_reply(form)
		elif path == f"{BASE_PATH}/password":
			self._change_password(session_id, form)
		elif path == f"{BASE_PATH}/logout":
			self.server.application.sessions.delete(session_id)
			self._redirect(LOGIN_PATH, clear_session=True)
		else:
			self._send_text(HTTPStatus.NOT_FOUND, "页面不存在")

	def _login(self, form: dict[str, str]) -> None:
		cookie_token = self._cookies().get(LOGIN_CSRF_COOKIE)
		form_token = form.get("csrf", "")
		if not cookie_token or not secrets.compare_digest(cookie_token, form_token):
			self._send_text(HTTPStatus.FORBIDDEN, "登录页面已过期，请刷新后重试")
			return
		if form.get("stage") == "verify":
			self._verify_login_code(form, form_token)
			return
		self._begin_login(form, form_token)

	def _begin_login(self, form: dict[str, str], form_token: str) -> None:
		address = self._rate_limit_address()
		retry_after = self.server.application.login_limiter.begin(address)
		if retry_after:
			self._send_text(HTTPStatus.TOO_MANY_REQUESTS, "登录尝试过多，请稍后再试", [("Retry-After", str(retry_after))])
			return
		try:
			record = load_password_record(self.server.application.config.password_path)
			username_valid = verify_username(form.get("username", ""), record)
			password_valid = verify_password(form.get("password", ""), record)
			valid = username_valid and password_valid
		except (OSError, ValueError, json.JSONDecodeError):
			LOG.error("password record could not be loaded")
			self._send_text(HTTPStatus.SERVICE_UNAVAILABLE, "后台密码尚未正确初始化")
			return
		if not valid:
			self._serve_login("账号或密码错误，请重试", status=HTTPStatus.UNAUTHORIZED)
			return
		self.server.application.login_limiter.succeed(address)
		retry_after = self.server.application.login_code_send_limiter.reserve(address)
		if retry_after:
			self._send_text(
				HTTPStatus.TOO_MANY_REQUESTS,
				"验证码发送过于频繁，请稍后再试",
				[("Retry-After", str(retry_after))],
			)
			return
		code = f"{secrets.randbelow(1_000_000):06d}"
		try:
			self.server.application.login_code_sender(
				self.server.application.config.smtp_path,
				LOGIN_CODE_RECIPIENT,
				code,
			)
		except (OSError, UnicodeError, ValueError, smtplib.SMTPException):
			self.server.application.login_code_send_limiter.release_latest(address)
			LOG.error("login verification email could not be sent")
			self._serve_login("验证码暂时无法发送，请稍后重试", status=HTTPStatus.SERVICE_UNAVAILABLE)
			return
		challenge_id = self.server.application.login_challenges.create(code)
		self._serve_verification(form_token, challenge_id)

	def _verify_login_code(self, form: dict[str, str], form_token: str) -> None:
		challenge_id = self._cookies().get(LOGIN_CHALLENGE_COOKIE)
		verification = self.server.application.login_challenges.verify(
			challenge_id,
			form.get("verification_code", "").strip(),
		)
		if verification.status == "verified":
			try:
				session_id, _session = self.server.application.sessions.create()
			except OSError:
				LOG.error("persistent admin session could not be created")
				self._send_text(HTTPStatus.SERVICE_UNAVAILABLE, "登录状态暂时无法保存，请稍后重试")
				return
			self._redirect(
				DASHBOARD_PATH,
				session_id=session_id,
				clear_login_csrf=True,
				clear_login_challenge=True,
			)
			return
		if verification.status == "invalid":
			self._serve_verification(
				form_token,
				challenge_id or "",
				f"验证码错误，还可尝试 {verification.attempts_remaining} 次",
				status=HTTPStatus.UNAUTHORIZED,
				set_challenge_cookie=False,
			)
			return
		if verification.status == "locked":
			message = "验证码错误次数过多，请重新输入账号和密码获取新验证码"
		elif verification.status == "expired":
			message = "验证码已过期，请重新输入账号和密码"
		else:
			message = "登录验证已失效，请重新输入账号和密码"
		self._serve_login(message, status=HTTPStatus.UNAUTHORIZED)

	def _update_settings(self, session_id: str, form: dict[str, str]) -> None:
		try:
			save_runtime(self.server.application.config.runtime_path, {
				"enabled": form.get("enabled") == "1",
				"model": form.get("model", ""),
				"thinking": form.get("thinking") == "1",
				"temperature": float(form.get("temperature", "")),
				"rules": {
					"allowed_paths": form.get("allowed_paths", ""),
					"blocked_paths": form.get("blocked_paths", ""),
					"ignored_keywords": form.get("ignored_keywords", ""),
					"quiet_start": form.get("quiet_start", "").strip(),
					"quiet_end": form.get("quiet_end", "").strip(),
					"daily_limit": form.get("daily_limit", "0").strip() or "0",
				},
			})
		except (OSError, ValueError):
			self.server.application.sessions.set_flash(session_id, "设置未保存：请检查模型与温度值", True)
		else:
			self.server.application.sessions.set_flash(session_id, "回复设置已保存，将在下一轮处理时生效")
		self._redirect(DASHBOARD_PATH)

	def _update_key(self, session_id: str, form: dict[str, str]) -> None:
		try:
			replace_api_key(self.server.application.config.key_path, form.get("api_key", ""))
		except (OSError, ValueError) as error:
			self.server.application.sessions.set_flash(session_id, str(error), True)
		else:
			self.server.application.sessions.set_flash(session_id, "SiliconFlow API Key 已安全替换")
		self._redirect(DASHBOARD_PATH)

	def _test_provider(self, session_id: str) -> None:
		try:
			elapsed = probe_siliconflow(load_runtime(self.server.application.config.runtime_path), self.server.application.config.key_path)
		except (OSError, ValueError) as error:
			self.server.application.sessions.set_flash(session_id, f"测试失败：{error}", True)
		else:
			self.server.application.sessions.set_flash(session_id, f"SiliconFlow 测试成功，用时 {elapsed:.2f} 秒")
		self._redirect(DASHBOARD_PATH)

	def _manual_reply(self, session_id: str, form: dict[str, str]) -> None:
		started = time.monotonic()
		source_id: int | None = None
		row: sqlite3.Row | None = None
		public_reply = ""
		try:
			raw_id = form.get("comment_id", "").strip()
			if not raw_id or not raw_id.isascii() or not raw_id.isdigit():
				raise ValueError("评论 ID 必须是正整数")
			source_id = int(raw_id)
			if not 1 <= source_id <= 2**63 - 1:
				raise ValueError("评论 ID 无效")
			connection_config = load_reviewer_connection(
				self.server.application.config.reviewer_config_path,
			)
			row = load_comment_for_reply(connection_config, source_id)
			if row is None:
				raise ValueError("找不到这条评论，请确认 ID 后重试")
			if str(row["status"] or "").strip().lower() != "approved":
				raise ValueError("目标评论尚未通过审核，暂不能回复")
			if str(row["mail"] or "").strip().lower() == connection_config.bot_mail.lower():
				raise ValueError("不能再次回复小爱客服自己的评论")
			existing_reply = load_existing_bot_reply(connection_config, source_id)
			if existing_reply is not None:
				raise ValueError(f"这条评论已经存在小爱客服回复（回复 ID：{existing_reply['id']}）")
			public_reply = make_manual_reply(form.get("reply", ""))
			reply_id, _reply_status = publish_manual_reply(row, connection_config, public_reply)
		except (OSError, UnicodeError, ValueError, json.JSONDecodeError, sqlite3.Error) as error:
			self.server.application.audit.record(
				"manual_reply", "failed", source_id=source_id,
				source_nick=str(row["nick"] or "访客") if row is not None else "",
				source_url=normalize_path(row["url"]) if row is not None else "",
				model="manual", content=public_reply or form.get("reply", ""), error=str(error),
				duration_ms=int((time.monotonic() - started) * 1000),
			)
			self.server.application.sessions.set_flash(session_id, f"手动回复未发布：{error}", True)
		else:
			self.server.application.audit.record(
				"manual_reply", "success", source_id=source_id, reply_id=reply_id,
				source_nick=str(row["nick"] or "访客") if row is not None else "",
				source_url=normalize_path(row["url"]) if row is not None else "",
				model="manual", content=public_reply,
				duration_ms=int((time.monotonic() - started) * 1000),
			)
			reply_label = f"（回复 ID：{reply_id}）" if reply_id is not None else ""
			self.server.application.sessions.set_flash(
				session_id,
				f"已以小爱客服身份发布回复{reply_label}，公开显示与自动回复一致",
			)
		self._redirect(DASHBOARD_PATH)

	def _polish_reply(self, form: dict[str, str]) -> None:
		started = time.monotonic()
		draft = form.get("reply", "")
		try:
			polished = polish_manual_reply(
				draft,
				self.server.application.config.key_path,
			)
		except ValueError as error:
			self.server.application.audit.record(
				"polish", "failed", model=POLISH_MODEL, content=draft, error=str(error),
				duration_ms=int((time.monotonic() - started) * 1000),
			)
			self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
			return
		except PolishProviderError as error:
			self.server.application.audit.record(
				"polish", "failed", model=POLISH_MODEL, content=draft, error=str(error),
				duration_ms=int((time.monotonic() - started) * 1000),
			)
			self._send_json(HTTPStatus.BAD_GATEWAY, {"ok": False, "message": str(error)})
			return
		self.server.application.audit.record(
			"polish", "success", model=POLISH_MODEL, content=polished,
			duration_ms=int((time.monotonic() - started) * 1000),
		)
		self._send_json(
			HTTPStatus.OK,
			{"ok": True, "reply": polished, "model": POLISH_MODEL, "mode": "即时"},
		)

	def _change_password(self, session_id: str, form: dict[str, str]) -> None:
		current = form.get("current_password", "")
		new_password = form.get("new_password", "")
		confirmation = form.get("confirm_password", "")
		try:
			record = load_password_record(self.server.application.config.password_path)
			if not verify_password(current, record):
				raise ValueError("当前密码不正确")
			if not secrets.compare_digest(new_password, confirmation):
				raise ValueError("两次输入的新密码不一致")
			username = record.get("username")
			if not isinstance(username, str):
				raise ValueError("密码记录缺少登录账号，请重新初始化")
			save_password(self.server.application.config.password_path, new_password, username)
		except (OSError, ValueError, json.JSONDecodeError) as error:
			self.server.application.sessions.set_flash(session_id, f"密码未修改：{error}", True)
			self._redirect(DASHBOARD_PATH)
			return
		self.server.application.sessions.delete_all()
		self._redirect(f"{LOGIN_PATH}?changed=1", clear_session=True)

	def _serve_dashboard(self, session_id: str, session: Session, query: dict[str, list[str]] | None = None) -> None:
		query = query or {}
		def query_value(name: str, default: str = "") -> str:
			values = query.get(name) or []
			return str(values[0]).strip() if values else default

		try:
			settings = load_runtime(self.server.application.config.runtime_path)
		except (OSError, ValueError, json.JSONDecodeError) as error:
			self._send_text(HTTPStatus.INTERNAL_SERVER_ERROR, f"无法读取 runtime.json：{error}")
			return
		flash = self.server.application.sessions.pop_flash(session_id)
		notice_html = ""
		if flash:
			message, is_error = flash
			css_class = "notice error" if is_error else "notice"
			notice_html = f'<p class="{css_class}" role="status">{html.escape(message)}</p>'
		options = "".join(
			f'<option value="{html.escape(model, quote=True)}"{" selected" if model == settings["model"] else ""}>{html.escape(model)}</option>'
			for model in ALLOWED_MODELS
		)
		key_path = self.server.application.config.key_path
		key_state = "已配置" if key_path.is_file() and key_path.stat().st_size > 1 else "未配置"
		comment_options = '<option value="" label="评论列表暂不可用，请手动填写 ID"></option>'
		comment_feed_notice = "评论列表正在连接；也可以直接填写 Waline 评论 ID。"
		inbox_rows: list[sqlite3.Row] = []
		inbox_total = 0
		inbox_page = max(1, min(10000, int(query_value("page", "1") or "1"))) if query_value("page", "1").isdigit() else 1
		inbox_query = query_value("q")[:80]
		inbox_status = query_value("comment_status", "all")
		if inbox_status not in {"all", "approved", "waiting", "pending", "rejected"}:
			inbox_status = "all"
		inbox_reply_state = query_value("reply_state", "all")
		if inbox_reply_state not in {"all", "replied", "unreplied"}:
			inbox_reply_state = "all"
		inbox_notice = ""
		connection_config: ReviewerConnection | None = None
		try:
			connection_config = load_reviewer_connection(
				self.server.application.config.reviewer_config_path,
			)
			recent_comments = load_recent_comments(connection_config)
			comment_options = render_comment_options(recent_comments)
			if recent_comments:
				comment_feed_notice = f"已加载最近 {len(recent_comments)} 条通过审核的评论；输入框也支持回复更早的评论。"
			else:
				comment_feed_notice = "暂时没有可回复的已审核评论，请先让 Waline 完成审核，或直接填写评论 ID。"
		except (OSError, UnicodeError, ValueError, json.JSONDecodeError, sqlite3.Error) as error:
			comment_feed_notice = f"评论列表暂不可用：{error} 可直接填写评论 ID，或稍后刷新。"
			inbox_notice = comment_feed_notice
		if connection_config is not None:
			try:
				inbox_rows, inbox_total, inbox_page = load_comment_inbox(
					connection_config,
					page=inbox_page,
					query=inbox_query,
					status_filter=inbox_status,
					reply_filter=inbox_reply_state,
				)
			except (OSError, UnicodeError, ValueError, json.JSONDecodeError, sqlite3.Error) as error:
				inbox_notice = f"评论收件箱暂不可用：{error}"
		else:
			inbox_notice = inbox_notice or "评论连接配置尚未部署。"
		rules = settings.get("rules", {})
		status_options = "".join(
			f'<option value="{value}"{" selected" if value == inbox_status else ""}>{label}</option>'
			for value, label in (("all", "全部状态"), ("approved", "已通过"), ("waiting", "待审核"), ("pending", "处理中"), ("rejected", "已拒绝"))
		)
		reply_options = "".join(
			f'<option value="{value}"{" selected" if value == inbox_reply_state else ""}>{label}</option>'
			for value, label in (("all", "全部回复"), ("unreplied", "未回复"), ("replied", "已回复"))
		)
		usage_summary = self.server.application.audit.summary()
		audit_rows = self.server.application.audit.recent(12)
		page = self.server.application.template.substitute(
			csrf=html.escape(session.csrf, quote=True),
			notice_html=notice_html,
			enabled_checked="checked" if settings["enabled"] else "",
			thinking_checked="checked" if settings["thinking"] else "",
			model_options=options,
			temperature=f'{settings["temperature"]:.2f}'.rstrip("0").rstrip("."),
			key_state=key_state,
			comment_options=comment_options,
			comment_feed_notice=html.escape(comment_feed_notice),
			manual_reply_max_chars=str(MANUAL_REPLY_MAX_CHARS),
			manual_reply_disclaimer=html.escape(MANUAL_REPLY_DISCLAIMER, quote=True),
			health_html=reviewer_health(connection_config, settings, key_path, self.server.application.audit),
			inbox_notice=html.escape(inbox_notice),
			inbox_html=render_inbox_rows(inbox_rows),
			inbox_pagination=render_pagination(inbox_page, inbox_total, inbox_query, inbox_status, inbox_reply_state),
			inbox_query=html.escape(inbox_query, quote=True),
			inbox_status_options=status_options,
			inbox_reply_options=reply_options,
			allowed_paths=html.escape("\n".join(rules.get("allowed_paths", []))),
			blocked_paths=html.escape("\n".join(rules.get("blocked_paths", []))),
			ignored_keywords=html.escape("\n".join(rules.get("ignored_keywords", []))),
			quiet_start=html.escape(str(rules.get("quiet_start", "")), quote=True),
			quiet_end=html.escape(str(rules.get("quiet_end", "")), quote=True),
			daily_limit=html.escape(str(rules.get("daily_limit", 0)), quote=True),
			usage_html=render_usage(usage_summary),
			audit_html=render_event_rows(audit_rows),
			dashboard_script=DASHBOARD_SCRIPT,
		)
		self._send_html(HTTPStatus.OK, page)

	def _serve_verification(
		self,
		csrf_token: str,
		challenge_id: str,
		message: str = "",
		status: HTTPStatus = HTTPStatus.OK,
		*,
		set_challenge_cookie: bool = True,
	) -> None:
		alert = f'<p class="notice" role="alert">{html.escape(message)}</p>' if message else ""
		page = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>邮箱验证 · 小爱客服</title><style>{LOGIN_PAGE_STYLES}</style></head>
<body><main>
	<section class="hello" aria-labelledby="login-title"><div class="brand"><img class="avatar" src="{AVATAR_URL}" alt="小爱客服头像" width="128" height="128"><div class="brand-text"><h1 id="login-title">安全确认</h1><p class="hello-copy">验证码只会发送到站长绑定的邮箱，替小爱守好控制台。</p></div></div><ol class="steps" aria-label="登录进度"><li><span class="step-dot">✓</span>账号与密码已确认</li><li><span class="step-dot">2</span>输入邮箱验证码</li><li><span class="step-dot">3</span>进入小爱控制台</li></ol></section>
	<form method="post" action="{LOGIN_PATH}">
		<div class="form-heading"><h2>查看邮箱里的 6 位数字</h2><p class="subheading">邮件通常会在几秒内送达，请勿将验证码告诉他人。</p></div>
		{alert}
		<div class="email-card"><span class="mail-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="m4.5 7 7.5 6 7.5-6"></path></svg></span><p>验证码已发送至<strong>{html.escape(masked_login_email())}</strong></p></div>
		<input type="hidden" name="csrf" value="{html.escape(csrf_token, quote=True)}"><input type="hidden" name="stage" value="verify">
		<label class="field"><span class="field-name"><span>邮箱验证码</span><span class="field-note">10 分钟内有效</span></span><input class="code-input" type="text" name="verification_code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{{6}}" minlength="6" maxlength="6" placeholder="000000" aria-describedby="code-help" autofocus required></label>
		<button class="primary" type="submit">验证并登录</button>
		<div class="resend-row"><button class="secondary" type="button" data-resend-button data-login-url="{LOGIN_PATH}" disabled>重新获取验证码（60s）</button><span class="help" data-resend-status aria-live="polite">60 秒后可以重新获取验证码</span></div>
		<p class="help" id="code-help"><strong>验证成功后，登录状态将保留 30 天。</strong>验证码最多可尝试 5 次，若已过期，请返回重新验证账号。</p>
		<noscript><p class="help">浏览器未启用 JavaScript。<a class="noscript-link" href="{LOGIN_PATH}">返回账号验证页重新获取验证码</a></p></noscript>
	</form>
</main><script>{LOGIN_PAGE_SCRIPT}</script></body></html>'''
		headers: list[tuple[str, str]] = []
		if set_challenge_cookie:
			headers.append((
				"Set-Cookie",
				f"{LOGIN_CHALLENGE_COOKIE}={challenge_id}; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age={LOGIN_CODE_SECONDS}",
			))
		self._send_html(status, page, headers)

	def _serve_login(self, message: str = "", status: HTTPStatus = HTTPStatus.OK) -> None:
		token = secrets.token_urlsafe(32)
		query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
		is_success = False
		if query.get("changed") == ["1"]:
			message = "密码已修改，请重新登录"
			is_success = True
		notice_class = "notice success" if is_success else "notice"
		notice_role = "status" if is_success else "alert"
		alert = f'<p class="{notice_class}" role="{notice_role}">{html.escape(message)}</p>' if message else ""
		page = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录 · 小爱客服</title><style>{LOGIN_PAGE_STYLES}</style></head>
<body><main>
	<section class="hello" aria-labelledby="login-title"><div class="brand"><img class="avatar" src="{AVATAR_URL}" alt="小爱客服头像" width="128" height="128"><div class="brand-text"><h1 id="login-title">欢迎回来</h1><p class="hello-copy">登录小爱客服控制台，管理她的模型、回复方式与密钥。</p></div></div><ol class="steps" aria-label="登录步骤"><li><span class="step-dot">1</span>验证管理员账号</li><li><span class="step-dot">2</span>接收 6 位邮箱验证码</li><li><span class="step-dot">3</span>安全进入控制台</li></ol></section>
	<form method="post" action="{LOGIN_PATH}">
		<div class="form-heading"><h2>管理员登录</h2><p class="subheading">账号和密码通过后，小爱会发送一次性验证码。</p></div>
		{alert}
		<input type="hidden" name="csrf" value="{html.escape(token, quote=True)}"><input type="hidden" name="stage" value="credentials">
		<label class="field"><span class="field-name"><span>登录账号</span></span><input type="text" name="username" maxlength="128" autocomplete="username" spellcheck="false" placeholder="请输入管理员账号" autofocus required></label>
		<label class="field"><span class="field-name"><span>登录密码</span></span><input type="password" name="password" maxlength="1024" autocomplete="current-password" placeholder="请输入登录密码" required></label>
		<div class="email-card"><span class="mail-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="m4.5 7 7.5 6 7.5-6"></path></svg></span><p>验证码只会发送至<strong>{html.escape(masked_login_email())}</strong></p></div>
		<button class="primary" type="submit">验证账号并发送验证码</button>
		<p class="help"><strong>登录成功后保持 30 天。</strong>连续失败 5 次将暂停登录 15 分钟，验证码发送间隔为 60 秒。</p>
	</form>
</main></body></html>'''
		csrf_cookie = f"{LOGIN_CSRF_COOKIE}={token}; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=600"
		challenge_cookie = f"{LOGIN_CHALLENGE_COOKIE}=; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
		self._send_html(status, page, [("Set-Cookie", csrf_cookie), ("Set-Cookie", challenge_cookie)])

	def _serve_avatar(self) -> None:
		path = self.server.application.config.asset_root / "favicon" / "chaoc-tingyu-avatar-512.png"
		try:
			content = path.read_bytes()
		except OSError:
			self._send_text(HTTPStatus.NOT_FOUND, "头像资源不存在")
			return
		self._send(HTTPStatus.OK, content, "image/png", [("Cache-Control", "public, max-age=86400")])

	def _read_form(self) -> dict[str, str]:
		content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
		if content_type != "application/x-www-form-urlencoded":
			raise ValueError("只接受表单请求")
		try:
			length = int(self.headers.get("Content-Length", "0"))
		except ValueError:
			raise ValueError("Content-Length 无效") from None
		if not 0 <= length <= MAX_BODY_BYTES:
			raise ValueError("请求内容过大")
		try:
			body = self.rfile.read(length).decode("utf-8", errors="strict")
		except UnicodeDecodeError:
			raise ValueError("表单编码无效") from None
		parsed = urllib.parse.parse_qs(body, keep_blank_values=True, strict_parsing=False, max_num_fields=24)
		return {key: values[-1] for key, values in parsed.items() if values}

	def _origin_matches(self) -> bool:
		expected_origin = self.server.application.config.origin
		origin = self.headers.get("Origin", "").rstrip("/")
		if origin:
			return secrets.compare_digest(origin, expected_origin)

		referer = self.headers.get("Referer", "")
		if not referer:
			return False
		parts = urllib.parse.urlsplit(referer)
		referer_origin = f"{parts.scheme}://{parts.netloc}".rstrip("/")
		path = parts.path.rstrip("/")
		return secrets.compare_digest(referer_origin, expected_origin) and (
			path == BASE_PATH or path.startswith(f"{BASE_PATH}/")
		)

	def _cookies(self) -> dict[str, str]:
		jar = http.cookies.SimpleCookie()
		try:
			jar.load(self.headers.get("Cookie", ""))
		except http.cookies.CookieError:
			return {}
		return {key: morsel.value for key, morsel in jar.items()}

	def _rate_limit_address(self) -> str:
		peer = self.client_address[0]
		try:
			if not ipaddress.ip_address(peer).is_loopback:
				return peer
		except ValueError:
			return peer
		forwarded = self.headers.get("X-Real-IP", "").strip()
		try:
			return str(ipaddress.ip_address(forwarded)) if forwarded else peer
		except ValueError:
			return peer

	def _current_session(self) -> tuple[str | None, Session | None]:
		session_id = self._cookies().get(SESSION_COOKIE)
		return session_id, self.server.application.sessions.get(session_id)

	def _redirect(
		self,
		location: str,
		*,
		session_id: str | None = None,
		clear_session: bool = False,
		clear_login_csrf: bool = False,
		clear_login_challenge: bool = False,
	) -> None:
		headers: list[tuple[str, str]] = [("Location", location)]
		if session_id:
			headers.append(("Set-Cookie", f"{SESSION_COOKIE}={session_id}; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age={SESSION_SECONDS}"))
		if clear_session:
			headers.append(("Set-Cookie", f"{SESSION_COOKIE}=; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=0"))
		if clear_login_csrf:
			headers.append(("Set-Cookie", f"{LOGIN_CSRF_COOKIE}=; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=0"))
		if clear_login_challenge:
			headers.append(("Set-Cookie", f"{LOGIN_CHALLENGE_COOKIE}=; Path={BASE_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=0"))
		self._send(HTTPStatus.SEE_OTHER, b"", "text/plain; charset=utf-8", headers)

	def _send_html(self, status: HTTPStatus, page: str, headers: list[tuple[str, str]] | None = None) -> None:
		self._send(status, page.encode("utf-8"), "text/html; charset=utf-8", headers)

	def _send_text(self, status: HTTPStatus, message: str, headers: list[tuple[str, str]] | None = None) -> None:
		self._send(status, message.encode("utf-8"), "text/plain; charset=utf-8", headers)

	def _send_json(self, status: HTTPStatus, payload: dict[str, Any], headers: list[tuple[str, str]] | None = None) -> None:
		body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
		self._send(status, body, "application/json; charset=utf-8", headers)

	def _send(self, status: HTTPStatus, body: bytes, content_type: str, headers: list[tuple[str, str]] | None = None) -> None:
		self.send_response(status)
		self.send_header("Content-Type", content_type)
		self.send_header("Content-Length", str(len(body)))
		self.send_header("Cache-Control", "no-store")
		self.send_header("Content-Security-Policy", f"default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-{LOGIN_PAGE_SCRIPT_HASH}' 'sha256-{DASHBOARD_SCRIPT_HASH}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
		self.send_header("X-Content-Type-Options", "nosniff")
		self.send_header("X-Frame-Options", "DENY")
		self.send_header("Referrer-Policy", "same-origin")
		self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		for key, value in headers or []:
			self.send_header(key, value)
		self.end_headers()
		if body:
			self.wfile.write(body)

	def log_message(self, message_format: str, *args: Any) -> None:
		LOG.info("%s - %s", self.client_address[0], message_format % args)


def parse_origin(value: str) -> str:
	origin = value.rstrip("/")
	parts = urllib.parse.urlsplit(origin)
	if parts.scheme != "https" or not parts.netloc or parts.path or parts.query or parts.fragment:
		raise argparse.ArgumentTypeError("origin must be an HTTPS origin without a path")
	return origin


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Waline AI local administration server")
	parser.add_argument("--runtime", type=Path, required=True, help="runtime.json path")
	parser.add_argument("--key-file", type=Path, required=True, help="SiliconFlow key file")
	parser.add_argument("--password-file", type=Path, required=True, help="PBKDF2 password record")
	parser.add_argument("--smtp-config", type=Path, default=DEFAULT_SMTP_CONFIG_PATH, help="SMTP JSON configuration")
	parser.add_argument("--sessions-file", type=Path, default=DEFAULT_SESSION_PATH, help="persistent admin session JSON")
	parser.add_argument("--reviewer-config", type=Path, default=DEFAULT_REVIEWER_CONFIG_PATH, help="server-side Waline reviewer config JSON")
	parser.add_argument("--origin", type=parse_origin, required=True, help="public HTTPS admin origin")
	parser.add_argument("--template", type=Path, default=Path(__file__).with_name("admin.html"))
	parser.add_argument("--asset-root", type=Path, default=Path(__file__).resolve().parents[2] / "public")
	return parser


def main() -> int:
	args = build_parser().parse_args()
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
	config = AdminConfig(
		args.runtime,
		args.key_file,
		args.password_file,
		args.template,
		args.asset_root,
		args.origin,
		args.smtp_config,
		args.sessions_file,
		args.reviewer_config,
	)
	if not config.password_path.is_file():
		raise SystemExit("password file is missing; initialize it with admin_password.py")
	application = AdminApplication(config)
	server = AdminHTTPServer((BIND_HOST, BIND_PORT), application)
	LOG.info("Waline AI admin listening on http://%s:%d", BIND_HOST, BIND_PORT)
	try:
		server.serve_forever()
	except KeyboardInterrupt:
		pass
	finally:
		server.server_close()
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
