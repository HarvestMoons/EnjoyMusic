# 第一阶段：构建阶段
FROM maven:3.9-eclipse-temurin-22 AS builder
WORKDIR /app
# 复制 pom.xml 和源码（注意路径）
COPY backend/pom.xml .
COPY backend/src ./src
# 打包应用程序
RUN mvn clean package -DskipTests

# 第二阶段：运行阶段
FROM openjdk:22-jdk-slim
WORKDIR /app
# 从构建阶段复制打好的 jar 包
COPY --from=builder /app/target/Ice-1.0-SNAPSHOT.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
