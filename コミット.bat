@echo off
chcp 65001 > nul
cd /d %~dp0

git add .
git commit -m "基盤"
git push origin master
echo Push完了!GItHubに反映されました

pause
