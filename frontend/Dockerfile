# frontend/Dockerfile
# build stage
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
# 如果使用 pnpm/yarn，根据你的项目替换安装命令
RUN npm ci
COPY . .
RUN npm run build

# production stage (nginx)
FROM nginx:alpine
# 删除默认配置并复制自定义的 nginx 配置
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# 将构建产物复制到 nginx 的默认静态目录
COPY --from=build /app/dist /usr/share/nginx/html

# 使用默认 nginx 启动命令
CMD ["nginx", "-g", "daemon off;"]
