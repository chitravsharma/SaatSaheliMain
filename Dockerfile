# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY FrontEnd/package.json FrontEnd/package-lock.json ./
RUN npm ci
COPY FrontEnd/ ./
ARG REACT_APP_API_URL=""
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
RUN npm run build

# Stage 2: Build Spring Boot JAR with frontend bundled
FROM eclipse-temurin:17-jdk-alpine AS backend-build
WORKDIR /app/backend
COPY SaatSaheli/mvnw SaatSaheli/mvnw.cmd ./
COPY SaatSaheli/pom.xml ./
COPY SaatSaheli/.mvn .mvn
RUN chmod +x mvnw
# Download dependencies first (cached layer)
RUN ./mvnw dependency:go-offline -B
COPY SaatSaheli/src ./src
# Copy React build into Spring Boot static resources
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static
RUN ./mvnw package -DskipTests -B

# Stage 3: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/backend/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-Xmx400m", "-Xms200m", "-XX:+UseSerialGC", "-jar", "app.jar"]
