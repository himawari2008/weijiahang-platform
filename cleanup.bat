@echo off
chcp 65001 >nul
echo ============================================
echo   为家航垃圾清理 + Token缓存优化
echo ============================================
echo.

echo [1/4] 删除 D:\wwwsjy6789 根目录安装包 (6个.exe ~1.37 GB)...
del /f "D:\wwwsjy6789\1326-2026-04-10190437-1775819077700.exe" 2>nul && echo   OK: 汽水音乐安装包 || echo   FAIL: 汽水音乐安装包
del /f "D:\wwwsjy6789\6172-2026-06-08120057-1780891257706.exe" 2>nul && echo   OK: 微信安装包 || echo   FAIL: 微信安装包
del /f "D:\wwwsjy6789\7033-2026-06-01162803-1780302483102.exe" 2>nul && echo   OK: GitHub Desktop安装包 || echo   FAIL: GitHub Desktop安装包
del /f "D:\wwwsjy6789\9882-2026-03-26042041-1774513241693.exe" 2>nul && echo   OK: 微信开发者工具安装包 || echo   FAIL: 微信开发者工具安装包
del /f "D:\wwwsjy6789\QQ9.9.31.49738_lenovo_x64.exe" 2>nul && echo   OK: QQ安装包 || echo   FAIL: QQ安装包
del /f "D:\wwwsjy6789\W.P.S.20.2706.exe" 2>nul && echo   OK: WPS安装包 || echo   FAIL: WPS安装包
echo   完成!
echo.

echo [2/4] 清理 .claude 旧会话历史 (~140 MB)...
del /f "C:\Users\wwwsjy6789\.claude\projects\d--vsClaude---\f7020b59-824e-4ac8-a185-adbb19ee9718.jsonl" 2>nul && echo   OK: 会话1 (81 MB) || echo   SKIP: 会话1 不存在
del /f "C:\Users\wwwsjy6789\.claude\projects\d--vsClaude---\491cfe19-a0ad-4733-941d-7ea5947b9b38.jsonl" 2>nul && echo   OK: 会话2 (60 MB) || echo   SKIP: 会话2 不存在
del /f "C:\Users\wwwsjy6789\.claude\projects\d--vsClaude---\0cef9256-2128-4554-bc4c-2f598b812068.jsonl" 2>nul && echo   OK: 会话3 (7 MB) || echo   SKIP: 会话3 不存在
del /f "C:\Users\wwwsjy6789\.claude\projects\d--vsClaude---\3d4730d7-2586-4b4e-866c-e55a2aef74d8.jsonl" 2>nul && echo   OK: 会话4 (3 MB) || echo   SKIP: 会话4 不存在
del /f "C:\Users\wwwsjy6789\.claude\projects\d--vsClaude---\892691db-2861-4f6b-9e7f-30ffe3a18d3f.jsonl" 2>nul && echo   OK: 会话5 (1 MB) || echo   SKIP: 会话5 不存在
echo   (保留当前会话文件)
echo   完成!
echo.

echo [3/4] 安装 claude-code-cache-fix (需要网络)...
call npm install -g claude-code-cache-fix 2>nul && echo   OK: claude-code-cache-fix 安装成功 || echo   FAIL: 安装失败，请检查Node.js和网络
echo.

echo [4/4] 验证清理结果...
echo.
echo D:\wwwsjy6789 剩余exe:
dir "D:\wwwsjy6789\*.exe" 2>nul || echo   全部清理完毕!
echo.
echo ============================================
echo   全部完成! 如claude-code-cache-fix安装成功:
echo   启动代理: node "$(npm root -g)/claude-code-cache-fix/proxy/server.mjs" ^&
echo   使用代理: set ANTHROPIC_BASE_URL=http://127.0.0.1:9801 ^&^& claude
echo ============================================
pause
