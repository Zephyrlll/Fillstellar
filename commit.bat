@echo off
chcp 65001 > nul
cd /d %~dp0

git add .
git commit -m "基盤"
git push origin main
echo Push完了!GitHubに反映されました

pause