
@echo off
chcp 65001 >nul
echo === Docker镜像推送脚本 ===

echo.
echo 1. 登录Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo 登录失败，请检查Docker是否运行
    pause
    exit /b 1
)

echo.
echo 2. 给镜像打标签...
set local_image=ice-spring:latest
set remote_image=beecool/music-player:latest

:: 检查本地镜像是否存在
docker images | findstr "ice-spring" >nul
if %errorlevel% neq 0 (
    echo 错误: 本地镜像 %local_image% 不存在
    echo 请先运行: docker-compose up --build
    pause
    exit /b 1
)

docker tag %local_image% %remote_image%
echo 标签完成: %local_image% -> %remote_image%

echo.
echo 3. 推送镜像到Docker Hub...
docker push %remote_image%

if %errorlevel% equ 0 (
    echo.
    echo ✅ 推送成功！
    echo 镜像地址: https://hub.docker.com/r/beecool/music-player
) else (
    echo.
    echo ❌ 推送失败
)

echo.
echo 脚本执行完成
pause