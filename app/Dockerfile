# 使用官方 Python 镜像
#docker build -t music-player .
#docker run -d -p 5000:5000 --name my-music-player music-player
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 拷贝依赖和应用代码
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝应用代码和音乐文件
COPY .. .

# 容器暴露端口
EXPOSE 5000

# 启动 Flask 服务
CMD ["python", "app.py"]
