# Script de démarrage pour le projet unifié
# Démarre tous les services backend et frontend

param(
    [string]$Mode = "dev",
    [switch]$Docker = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Démarrage du Système Unifié" -ForegroundColor Green
Write-Host "========================================`n"

if ($Docker) {
    Write-Host "🐳 Mode Docker Compose`n"
    docker-compose up -d
    Write-Host "`n✅ Services lancés via Docker Compose!"
    Write-Host "Frontend: http://localhost:4200"
    Write-Host "API Gateway: http://localhost:8080`n"
    exit 0
}

Write-Host "📌 Mode: $Mode`n"

# Configuration des ports
$services = @{
    "api-gateway" = 8080;
    "auth-service" = 8081;
    "ticket-service" = 8082;
    "ai-service" = 8083;
    "conversation-service" = 8084;
    "knowledge-base-service" = 8085;
}

Write-Host "========== BACKEND ==========" -ForegroundColor Yellow

# Vérifier Maven
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Maven n'est pas installé!" -ForegroundColor Red
    exit 1
}

# Compiler le backend
Write-Host "`n🔨 Compilation du backend..." -ForegroundColor Cyan
Set-Location backend
mvn clean install -DskipTests

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur de compilation!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Compilation réussie!`n"

# Démarrer les services
Write-Host "🚀 Démarrage des services...-ForegroundColor Cyan"

$jobs = @()

foreach ($service in $services.GetEnumerator()) {
    $name = $service.Key
    $port = $service.Value
    
    Write-Host "  → Démarrage $name (port $port)..."
    
    $scriptBlock = {
        param($svc, $p)
        Set-Location (Join-Path (Get-Location) $svc)
        mvn spring-boot:run
    }
    
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $name, $port
    $jobs += $job
}

Write-Host "`n✅ Services backend lancés!`n"

Write-Host "========== FRONTEND ==========" -ForegroundColor Yellow

# Vérifier Node.js
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js/npm n'est pas installé!" -ForegroundColor Red
    exit 1
}

Set-Location ../frontend/ticket-ui

Write-Host "`n📦 Installation des dépendances frontend..."
npm install

Write-Host "`n🚀 Démarrage du frontend Angular (port 4200)..."
npm start

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "✅ Système Unifié Démarré!" -ForegroundColor Green
Write-Host "========================================`n"

Write-Host "Frontend: http://localhost:4200"
Write-Host "API Gateway: http://localhost:8080"
Write-Host "Documentation API: http://localhost:8080/swagger-ui.html`n"

Write-Host "Services backend:" -ForegroundColor Yellow
foreach ($service in $services.GetEnumerator()) {
    Write-Host "  • $($service.Key): http://localhost:$($service.Value)"
}

Write-Host "`n📝 Logs des services backend:"
$jobs | ForEach-Object { Write-Host "  • Job: $($_.Name)" }

Write-Host "`nAppuyez sur Ctrl+C pour arrêter..."

# Garder le script actif
Wait-Job -Job $jobs
