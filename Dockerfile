# =============================================================================
# Dockerfile para Formu3 - Visualizador de Fórmulas de Liquidación RRHH
# Multi-stage build: Frontend (React/Vite) + Backend (Spring Boot)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (React + Vite + TypeScript)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar archivos de dependencias primero (cache de Docker)
COPY frontend/package.json frontend/package-lock.json ./

# Instalar dependencias
RUN npm ci --silent

# Copiar código fuente del frontend
COPY frontend/ ./

# Build de producción
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend (Spring Boot + Maven)
# -----------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS backend-builder

WORKDIR /app

# Copiar archivos de dependencias primero (cache de Docker)
COPY pom.xml ./

# Descargar dependencias (cache de Docker)
RUN mvn dependency:go-offline -B

# Copiar código fuente del backend
COPY src/ ./src/

# Copiar frontend compilado a resources/static para servir desde Spring Boot
COPY --from=frontend-builder /app/frontend/dist/ ./src/main/resources/static/

# Build del JAR (sin tests para acelerar el build)
RUN mvn clean package -DskipTests -B

# -----------------------------------------------------------------------------
# Stage 3: Runtime (JRE mínimo)
# -----------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-jammy AS runtime

WORKDIR /app

# Crear usuario no-root para seguridad
RUN groupadd -r formu && useradd -r -g formu formu

# Copiar JAR desde el builder
COPY --from=backend-builder /app/target/*.jar app.jar

# Cambiar ownership al usuario no-root
RUN chown -R formu:formu /app

# Cambiar a usuario no-root
USER formu

# Puerto de la aplicación
EXPOSE 8080

# Variables de entorno por defecto
ENV JAVA_OPTS="-Xmx512m -Xms256m -Duser.timezone=America/Argentina/Buenos_Aires"
ENV SPRING_PROFILES_ACTIVE=prod

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Comando de inicio
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
