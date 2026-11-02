# ============================================================
# Stage 1: Build JAR using Maven & Java 17
# ============================================================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# ============================================================
# Stage 2: Minimal Production JRE Image
# ============================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Add curl for container healthchecks
RUN apk add --no-cache curl

# Copy compiled JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Render assigns a dynamic $PORT (typically 10000)
# Fallback to 8080 for local docker development
ENV PORT=8080
EXPOSE 8080 10000

# -XX:MaxRAMPercentage=75.0 prevents JVM from exceeding Render's 512MB free tier
# -Dserver.port dynamically binds to whatever port Render or local Docker assigns
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75.0 -Dserver.port=${PORT:-8080} -jar app.jar"]
