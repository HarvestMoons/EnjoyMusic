# 使用官方 OpenJDK 作为基础镜像
FROM openjdk:22-jdk-slim

# 设置工作目录
WORKDIR /app

# 将 Maven/Gradle 构建出来的 jar 包拷贝到容器
COPY target/Ice-1.0-SNAPSHOT.jar app.jar

# 暴露端口（Spring Boot 默认 8080,修改到8082）
EXPOSE 8082

# 启动 Spring Boot 应用
ENTRYPOINT ["java", "-jar", "app.jar"]
