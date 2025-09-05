## 项目简介

本项目（小蜜蜂大乐堂）是一个使用docker容器打包的Python Flask+Nginx网站，可以听歌、换歌单、切歌、放视频、看频谱，前端采用原生 HTML 与 JavaScript 构建，并通过 Docker Compose 实现一键部署。该平台适用于私有音频内容的集中管理与在线播放。

## 开发流程

1. **音频资源采集**
    使用 Downkyi工具批量下载 Bilibili 平台音频资源，获取 `.mp3` 格式文件。
2. **音频预处理与格式规范化**
    编写辅助脚本，利用 `ffmpeg` 等工具，对音频文件进行批量转换和清洗，对采样率、编码格式、文件命名规范等做统一处理，确保兼容性和可播放性。
3. **前后端功能开发**
   - **前端**：使用原生 HTML/CSS/JavaScript 编写响应式音乐播放界面，实现播放控制、频谱可视化、分类切换等功能。
   - **后端**：基于 Flask 实现 API 服务，提供音频文件目录读取、随机播放、音频分发等接口。
4. **Nginx 反向代理与静态资源托管**
    编写 Nginx 配置文件，实现对 Flask 后端的反向代理转发，并对 `/music` 和 `/static` 路径下的音频及前端资源提供高效的静态资源服务。
5. **容器化与服务编排**
    编写 `Dockerfile` 和 `docker-compose.yml` 文件，将前端、后端与 Nginx 环境容器化部署，实现服务的快速构建、统一管理与灵活扩缩。
6. **云服务器部署与上线**
    在租用的云服务器上安装 Docker 与 Docker Compose，部署服务并配置防火墙、开放端口，实现公网访问。

## 备忘录：

启动方式：\app下，使用 docker compose up -d --build，访问http://localhost:8081/即可 
-d 表示“detached mode”，容器将在后台运行。

连续docker compose之后，用docker system prune清理多余资源

如果nginx配置修改，使用docker compose up -d --build --force-recreate重新构建
如果发现浏览器直接从本地磁盘缓存里拿了旧的 js文件，根本没去容器里请求，打开F12-Network-禁用缓存+刷新

~~长按空白处可以看彩蛋~~