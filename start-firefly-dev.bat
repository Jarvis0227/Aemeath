@echo off
cd /d "%~dp0"
call .\node_modules\.bin\astro.CMD dev --host 127.0.0.1 --port 4322 > firefly-dev.log 2> firefly-dev.err.log
