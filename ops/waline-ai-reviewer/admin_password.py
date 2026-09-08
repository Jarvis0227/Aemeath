#!/usr/bin/env python3
"""Initialize and verify the Waline AI admin password file."""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import secrets
import sys
from pathlib import Path
from typing import Any


ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 600_000
MIN_PASSWORD_LENGTH = 12


def atomic_write(path: Path, data: bytes, mode: int = 0o600) -> None:
	"""Replace a file without exposing a partially-written value."""
	path.parent.mkdir(parents=True, exist_ok=True)
	temporary = path.with_name(f".{path.name}.{secrets.token_hex(12)}.tmp")
	flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
	try:
		fd = os.open(temporary, flags, mode)
		with os.fdopen(fd, "wb") as handle:
			handle.write(data)
			handle.flush()
			os.fsync(handle.fileno())
		os.replace(temporary, path)
		try:
			os.chmod(path, mode)
		except OSError:
			pass
		try:
			directory_fd = os.open(path.parent, os.O_RDONLY)
			try:
				os.fsync(directory_fd)
			finally:
				os.close(directory_fd)
		except OSError:
			pass
	finally:
		try:
			temporary.unlink()
		except FileNotFoundError:
			pass


def validate_username(username: str) -> str:
	if username != username.strip() or not 3 <= len(username) <= 128:
		raise ValueError("username must contain 3 to 128 characters without surrounding whitespace")
	if any(ord(character) < 32 or character.isspace() for character in username):
		raise ValueError("username must not contain whitespace or control characters")
	return username


def make_password_record(password: str, username: str, *, iterations: int = ITERATIONS) -> dict[str, Any]:
	username = validate_username(username)
	if len(password) < MIN_PASSWORD_LENGTH:
		raise ValueError(f"password must contain at least {MIN_PASSWORD_LENGTH} characters")
	if len(password) > 1024:
		raise ValueError("password is too long")
	salt = secrets.token_bytes(32)
	digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
	return {
		"version": 1,
		"username": username,
		"algorithm": ALGORITHM,
		"iterations": iterations,
		"salt": base64.b64encode(salt).decode("ascii"),
		"hash": base64.b64encode(digest).decode("ascii"),
	}


def verify_password(password: str, record: dict[str, Any]) -> bool:
	try:
		if record.get("algorithm") != ALGORITHM:
			return False
		iterations = int(record["iterations"])
		if not 100_000 <= iterations <= 5_000_000:
			return False
		salt = base64.b64decode(str(record["salt"]), validate=True)
		expected = base64.b64decode(str(record["hash"]), validate=True)
		actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
		return hmac.compare_digest(actual, expected)
	except (KeyError, TypeError, ValueError):
		return False


def verify_username(username: str, record: dict[str, Any]) -> bool:
	expected = record.get("username")
	if not isinstance(expected, str):
		return False
	return hmac.compare_digest(username.encode("utf-8"), expected.encode("utf-8"))


def load_password_record(path: Path) -> dict[str, Any]:
	raw = json.loads(path.read_text(encoding="utf-8"))
	if not isinstance(raw, dict):
		raise ValueError("password file must contain an object")
	return raw


def save_password(path: Path, password: str, username: str) -> None:
	record = make_password_record(password, username)
	payload = (json.dumps(record, ensure_ascii=True, indent="\t") + "\n").encode("utf-8")
	atomic_write(path, payload)


def read_new_password(from_stdin: bool) -> str:
	if from_stdin:
		password = sys.stdin.readline().rstrip("\r\n")
		if not password:
			raise ValueError("stdin did not contain a password")
		return password
	password = getpass.getpass("New admin password: ")
	confirmation = getpass.getpass("Confirm password: ")
	if not hmac.compare_digest(password, confirmation):
		raise ValueError("passwords do not match")
	return password


def main() -> int:
	parser = argparse.ArgumentParser(description="Initialize the Waline AI admin password hash")
	parser.add_argument("--output", type=Path, required=True, help="password record file")
	parser.add_argument("--username", required=True, help="admin login username")
	parser.add_argument("--password-stdin", action="store_true", help="read one password line from stdin")
	parser.add_argument("--force", action="store_true", help="replace an existing password file")
	args = parser.parse_args()
	if args.output.exists() and not args.force:
		parser.error("output already exists; use --force to replace it")
	try:
		save_password(args.output, read_new_password(args.password_stdin), args.username)
	except ValueError as error:
		parser.error(str(error))
	print(f"Password hash written to {args.output}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
