# Script para compilar y desplegar Formu3 (Visualizador de Fórmulas RRHH)
# Compatible con Docker instalado fuera de snap
# Autor: Sistema UPCN

param(
    [string]$Command = "deploy"
)

# Configuracion
$IMAGE_NAME = "formu3"
$IMAGE_TAG = "latest"
$CONTAINER_NAME = "formu3-dev"
$HOST_PORT = "8776"
$CONTAINER_PORT = "8080"
$SERVER_IP = "192.168.0.212"

# Variables de entorno para base de datos (solo desde variables de entorno)
# Si no están definidas, Spring Boot usará los valores del application.yml
$DB_URL = $env:DB_URL
$DB_USERNAME = $env:DB_USERNAME
$DB_PASSWORD = $env:DB_PASSWORD
$SPRING_PROFILES_ACTIVE = if ($env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE } else { "prod" }

# Variable global para guardar el contexto original
$script:OriginalDockerContext = $null

# Funcion para restaurar el contexto Docker original
function Restore-DockerContext {
    if ($script:OriginalDockerContext) {
        Write-Host "Restaurando contexto Docker original: $script:OriginalDockerContext" -ForegroundColor Yellow
        docker context use $script:OriginalDockerContext 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Contexto restaurado a: $script:OriginalDockerContext" -ForegroundColor Green
        }
    }
}

# Funcion para verificar Docker
function Test-Docker {
    Write-Host "Verificando Docker..." -ForegroundColor Yellow
    try {
        $dockerVersion = docker --version
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker disponible: $dockerVersion" -ForegroundColor Green
            
            # Guardar contexto original antes de cambiar
            $script:OriginalDockerContext = docker context show
            Write-Host "Contexto Docker original: $script:OriginalDockerContext" -ForegroundColor Cyan
            
            # Configurar contexto de lservertest
            Write-Host "Cambiando temporalmente al contexto lservertest..." -ForegroundColor Yellow
            docker context use lservertest
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Contexto lservertest configurado correctamente" -ForegroundColor Green
                Write-Host "NOTA: El contexto se restaurara automaticamente al finalizar" -ForegroundColor Cyan
            } else {
                Write-Host "Error: No se pudo configurar el contexto lservertest" -ForegroundColor Red
                return $false
            }
            
            return $true
        } else {
            Write-Host "Error: Docker no esta disponible" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error: Docker no esta instalado o no esta en el PATH" -ForegroundColor Red
        Write-Host "Asegurate de que Docker este instalado y funcionando" -ForegroundColor Yellow
        return $false
    }
}

# Funcion para mostrar ayuda
function Show-Help {
    Write-Host "Uso: .\deploy-to-lservertest.ps1 [comando]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host "  deploy     - Deployment completo (por defecto)" -ForegroundColor Green
    Write-Host "  build      - Solo construir imagen" -ForegroundColor Green
    Write-Host "  run        - Solo ejecutar contenedor" -ForegroundColor Green
    Write-Host "  stop       - Detener contenedor" -ForegroundColor Green
    Write-Host "  restart    - Reiniciar contenedor" -ForegroundColor Green
    Write-Host "  logs       - Ver logs" -ForegroundColor Green
    Write-Host "  status     - Ver estado" -ForegroundColor Green
    Write-Host "  clean      - Detener y remover contenedor" -ForegroundColor Green
    Write-Host "  help       - Mostrar esta ayuda" -ForegroundColor Green
    Write-Host ""
    Write-Host "Variables de entorno opcionales:" -ForegroundColor Yellow
    Write-Host "  Si no se definen, se usaran los valores del application.yml" -ForegroundColor Gray
    Write-Host "  DB_URL - URL de conexion a SQL Server" -ForegroundColor Cyan
    Write-Host "  DB_USERNAME, DB_PASSWORD" -ForegroundColor Cyan
    Write-Host "  SPRING_PROFILES_ACTIVE (default: prod)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-lservertest.ps1              # Deployment completo" -ForegroundColor Cyan
    Write-Host "  .\deploy-to-lservertest.ps1 build        # Solo construir" -ForegroundColor Cyan
    Write-Host "  .\deploy-to-lservertest.ps1 logs         # Ver logs" -ForegroundColor Cyan
}

# Funcion para limpiar recursos (solo detiene contenedor anterior)
function Clean-Resources {
    Write-Host "Preparando deployment..." -ForegroundColor Yellow
    
    # Detener contenedor si existe
    $containerExists = docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | Select-String $CONTAINER_NAME
    if ($containerExists) {
        Write-Host "Deteniendo contenedor existente: $CONTAINER_NAME" -ForegroundColor Yellow
        docker stop $CONTAINER_NAME 2>$null
        docker rm $CONTAINER_NAME 2>$null
        Write-Host "Contenedor removido" -ForegroundColor Green
    } else {
        Write-Host "No hay contenedor existente" -ForegroundColor Yellow
    }
    
    Write-Host "Listo para deployment" -ForegroundColor Green
}

# Funcion para construir imagen
function Build-Image {
    # Verificar Docker primero
    if (-not (Test-Docker)) {
        exit 1
    }
    
    Write-Host "Construyendo imagen Docker (multi-stage build con Frontend + Backend)..." -ForegroundColor Yellow
    
    # Verificar que Dockerfile existe
    if (-not (Test-Path "Dockerfile")) {
        Write-Host "Error: Dockerfile no encontrado en el directorio actual" -ForegroundColor Red
        exit 1
    }
    
    # Construir imagen (Docker usa cache automaticamente)
    # Las imagenes base se descargan solo la primera vez
    Write-Host "Ejecutando: docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ." -ForegroundColor Cyan
    Write-Host "NOTA: Las dependencias de Maven y npm se descargaran solo si cambian pom.xml o package.json" -ForegroundColor Yellow
    
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Imagen construida exitosamente: ${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Green
    } else {
        Write-Host "Error al construir la imagen Docker" -ForegroundColor Red
        Write-Host "Verifica que Docker este funcionando correctamente" -ForegroundColor Yellow
        exit 1
    }
}

# Funcion para ejecutar contenedor
function Run-Container {
    # Verificar Docker primero
    if (-not (Test-Docker)) {
        exit 1
    }
    
    Write-Host "Ejecutando contenedor..." -ForegroundColor Yellow
    
    # Verificar que la imagen existe
    $imageExists = docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "{{.Repository}}:{{.Tag}}" | Select-String "${IMAGE_TAG}"
    if (-not $imageExists) {
        Write-Host "Error: La imagen ${IMAGE_NAME}:${IMAGE_TAG} no existe" -ForegroundColor Red
        Write-Host "Ejecuta primero: .\deploy-to-lservertest.ps1 build" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Imagen encontrada: ${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Green
    Write-Host "Configurando variables de entorno..." -ForegroundColor Yellow
    
    # Construir comando docker run con solo las variables de entorno definidas
    $envVars = @()
    
    if ($DB_URL) {
        $envVars += "-e SPRING_DATASOURCE_URL=$DB_URL"
        Write-Host "  DB_URL: configurado" -ForegroundColor Cyan
    }
    if ($DB_USERNAME) {
        $envVars += "-e SPRING_DATASOURCE_USERNAME=$DB_USERNAME"
        Write-Host "  DB_USERNAME: configurado" -ForegroundColor Cyan
    }
    if ($DB_PASSWORD) {
        $envVars += "-e SPRING_DATASOURCE_PASSWORD=$DB_PASSWORD"
        Write-Host "  DB_PASSWORD: configurado" -ForegroundColor Cyan
    }
    
    # SPRING_PROFILES_ACTIVE siempre se pasa (tiene default)
    $envVars += "-e SPRING_PROFILES_ACTIVE=$SPRING_PROFILES_ACTIVE"
    Write-Host "  SPRING_PROFILES_ACTIVE: $SPRING_PROFILES_ACTIVE" -ForegroundColor Cyan
    
    # JAVA_OPTS siempre se pasa (incluye timezone)
    $envVars += "-e JAVA_OPTS='-Xmx512m -Xms256m -Duser.timezone=America/Argentina/Buenos_Aires'"
    
    # TZ también se pasa como variable de entorno del sistema
    $envVars += "-e TZ=America/Argentina/Buenos_Aires"
    
    # Permitir CORS para acceso desde otros orígenes
    $envVars += "-e CORS_ALLOWED_ORIGINS=*"
    
    # Construir comando completo con mapeo de puertos
    $envVarsString = $envVars -join " "
    $dockerRunCmd = "docker run -d --name $CONTAINER_NAME --restart unless-stopped -p ${HOST_PORT}:${CONTAINER_PORT} $envVarsString `"${IMAGE_NAME}:${IMAGE_TAG}`""
    
    Write-Host "Ejecutando contenedor..." -ForegroundColor Cyan
    Invoke-Expression $dockerRunCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Contenedor iniciado exitosamente: $CONTAINER_NAME" -ForegroundColor Green
    } else {
        Write-Host "Error al iniciar el contenedor" -ForegroundColor Red
        Write-Host "Verifica que el puerto ${HOST_PORT} no este en uso" -ForegroundColor Yellow
        exit 1
    }
}

# Funcion para ver logs
function Show-Logs {
    Write-Host "Mostrando logs de $CONTAINER_NAME..." -ForegroundColor Yellow
    docker logs -f $CONTAINER_NAME
}

# Funcion para ver estado
function Show-Status {
    Write-Host "Estado del contenedor:" -ForegroundColor Yellow
    $status = docker ps | Select-String $CONTAINER_NAME
    if ($status) {
        Write-Host $status -ForegroundColor Green
    } else {
        Write-Host "Contenedor no esta corriendo" -ForegroundColor Red
        Write-Host "Contenedores detenidos:" -ForegroundColor Yellow
        docker ps -a | Select-String $CONTAINER_NAME
    }
}

# Funcion para detener contenedor
function Stop-Container {
    Write-Host "Deteniendo contenedor..." -ForegroundColor Yellow
    docker stop $CONTAINER_NAME
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Contenedor detenido" -ForegroundColor Green
    } else {
        Write-Host "Error al detener el contenedor" -ForegroundColor Red
    }
}

# Funcion para reiniciar contenedor
function Restart-Container {
    Write-Host "Reiniciando contenedor..." -ForegroundColor Yellow
    docker restart $CONTAINER_NAME
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Contenedor reiniciado" -ForegroundColor Green
    } else {
        Write-Host "Error al reiniciar el contenedor" -ForegroundColor Red
    }
}

# Funcion principal de deployment
function Start-FullDeploy {
    Write-Host "Iniciando deployment completo de Formu3 (Visualizador de Formulas RRHH)..." -ForegroundColor Cyan
    Write-Host "Imagen: ${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Yellow
    Write-Host "Contenedor: $CONTAINER_NAME" -ForegroundColor Yellow
    Write-Host "Puerto: ${HOST_PORT} -> ${CONTAINER_PORT}" -ForegroundColor Yellow
    Write-Host "Servidor: $SERVER_IP" -ForegroundColor Yellow

    # Verificar que Docker este corriendo
    if (-not (Test-Docker)) {
        exit 1
    }

    # Detener contenedor anterior si existe
    Clean-Resources

    # Construir imagen (multi-stage build incluye compilación frontend + backend)
    # Docker usa cache automaticamente: imagenes base y dependencias solo se descargan si cambian
    Build-Image

    # Ejecutar contenedor
    Run-Container

    Write-Host ""
    Write-Host "Informacion del deployment:" -ForegroundColor Cyan
    Write-Host "   URL: http://${SERVER_IP}:${HOST_PORT}" -ForegroundColor Green
    Write-Host "   Contenedor: $CONTAINER_NAME" -ForegroundColor Green
    Write-Host "   Imagen: ${IMAGE_NAME}:${IMAGE_TAG}" -ForegroundColor Green
    Write-Host "   Perfil: $SPRING_PROFILES_ACTIVE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Comandos utiles:" -ForegroundColor Yellow
    Write-Host "   Ver logs: .\deploy-to-lservertest.ps1 logs" -ForegroundColor Cyan
    Write-Host "   Parar: .\deploy-to-lservertest.ps1 stop" -ForegroundColor Cyan
    Write-Host "   Reiniciar: .\deploy-to-lservertest.ps1 restart" -ForegroundColor Cyan
    Write-Host "   Estado: .\deploy-to-lservertest.ps1 status" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Esperando que la aplicacion este lista..." -ForegroundColor Yellow
    
    # Esperar a que la aplicacion este lista
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://${SERVER_IP}:${HOST_PORT}" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "Aplicacion lista y funcionando!" -ForegroundColor Green
                break
            }
        } catch {
            # Continuar esperando
        }
        Write-Host "Esperando... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    Write-Host ""
    Write-Host "Deployment completado exitosamente!" -ForegroundColor Green
    Write-Host "La aplicacion esta disponible en: http://${SERVER_IP}:${HOST_PORT}" -ForegroundColor Cyan
}

# Procesar comandos con restauración de contexto al final
try {
    switch ($Command.ToLower()) {
        "deploy" {
            Start-FullDeploy
        }
        "build" {
            Build-Image
        }
        "run" {
            Run-Container
        }
        "stop" {
            Stop-Container
        }
        "restart" {
            Restart-Container
        }
        "logs" {
            Show-Logs
        }
        "status" {
            Show-Status
        }
        "clean" {
            Clean-Resources
        }
        "help" {
            Show-Help
        }
        default {
            Write-Host "Comando desconocido: $Command" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
} finally {
    # Siempre restaurar el contexto Docker original al finalizar
    Restore-DockerContext
}
