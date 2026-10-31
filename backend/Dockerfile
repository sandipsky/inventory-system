# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build

# Copy the wrapper first so dependency resolution is cached between builds
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

COPY src src
RUN ./mvnw clean package -DskipTests -q

# Build the seed database (schema + required master data) so the image
# is self-contained — no manual seeding needed on the target machine
RUN apt-get update -qq && apt-get install -y -qq sqlite3 >/dev/null
COPY database.sql .
RUN sqlite3 seed.db < database.sql

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre
WORKDIR /app

# The Spring Boot WAR is executable (embedded Tomcat ships in WEB-INF/lib-provided)
COPY --from=build /build/target/*.war app.war
COPY --from=build /build/seed.db /app/seed/inventory_system.db
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# SQLite database and uploaded images live outside the image
RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

ENV SPRING_DATASOURCE_URL="jdbc:sqlite:/app/data/inventory_system.db" \
    FILE_UPLOAD_DIR="/app/uploads/"

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
