# Scripts de utilidad para Docker
# Ejecutar desde PowerShell en la raíz del proyecto

# Función para desarrollo
function Start-Dev {
    Write-Host "🚀 Iniciando contenedor de desarrollo..." -ForegroundColor Green
    docker-compose --profile dev up --build
}

# Función para producción
function Start-Prod {
    Write-Host "🚀 Iniciando contenedor de producción..." -ForegroundColor Green
    docker-compose --profile prod up --build
}

# Función para construir imagen de producción
function Build-Production {
    Write-Host "🔨 Construyendo imagen de producción..." -ForegroundColor Yellow
    docker build -t autotrack-ai:latest .
}

# Función para limpiar recursos Docker
function Clean-Docker {
    Write-Host "🧹 Limpiando recursos Docker..." -ForegroundColor Red
    docker system prune -f
    docker volume prune -f
}

# Función para ver logs
function Show-Logs {
    param(
        [string]$Service = "autotrack-dev"
    )
    docker-compose logs -f $Service
}

# Exportar funciones
Export-ModuleMember -Function Start-Dev, Start-Prod, Build-Production, Clean-Docker, Show-Logs

Write-Host "📋 Comandos disponibles:" -ForegroundColor Cyan
Write-Host "  Start-Dev       - Iniciar en modo desarrollo" -ForegroundColor White
Write-Host "  Start-Prod      - Iniciar en modo producción" -ForegroundColor White
Write-Host "  Build-Production- Construir imagen de producción" -ForegroundColor White
Write-Host "  Clean-Docker    - Limpiar recursos Docker" -ForegroundColor White
Write-Host "  Show-Logs       - Ver logs del contenedor" -ForegroundColor White
