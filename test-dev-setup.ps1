# Script de teste para verificar se o setup de desenvolvimento está funcionando
# Execute este script após iniciar os serviços com .\dev-mode.ps1 -Mode services

$GREEN = "Green"
$YELLOW = "Yellow"
$RED = "Red"
$BLUE = "Cyan"

function Write-Color($Message, $Color) {
    Write-Host $Message -ForegroundColor $Color
}

Write-Color "🧪 Testando configuração de desenvolvimento..." $BLUE
Write-Color "" $BLUE

# Verificar se Docker está rodando
Write-Color "📋 Verificando Docker..." $YELLOW
try {
    docker version | Out-Null
    Write-Color "✅ Docker está funcionando" $GREEN
} catch {
    Write-Color "❌ Docker não está funcionando" $RED
    exit 1
}

# Verificar containers
Write-Color "📋 Verificando containers dos serviços..." $YELLOW
$services = @("milvus", "redis", "ollama", "etcd", "minio")
$allRunning = $true

foreach ($service in $services) {
    $running = docker ps --filter "name=$service" --format "table {{.Names}}" | Select-String $service
    if ($running) {
        Write-Color "✅ $service está rodando" $GREEN
    } else {
        Write-Color "❌ $service não está rodando" $RED
        $allRunning = $false
    }
}

if (-not $allRunning) {
    Write-Color "" $RED
    Write-Color "⚠️  Alguns serviços não estão rodando. Execute primeiro:" $YELLOW
    Write-Color "   .\dev-mode.ps1 -Mode services" $YELLOW
    Write-Color "" $RED
    exit 1
}

# Aguardar serviços estabilizarem
Write-Color "" $BLUE
Write-Color "⏳ Aguardando serviços estabilizarem (30 segundos)..." $YELLOW
Start-Sleep -Seconds 30

# Testar APIs dos serviços
Write-Color "📋 Testando APIs dos serviços..." $YELLOW

# Teste Ollama
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/version" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Color "✅ Ollama API está respondendo" $GREEN
    }
} catch {
    Write-Color "❌ Ollama API não está respondendo" $RED
}

# Teste Milvus Health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9091/healthz" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Color "✅ Milvus está saudável" $GREEN
    }
} catch {
    Write-Color "❌ Milvus não está saudável" $RED
}

# Teste Redis (via Docker exec)
try {
    $result = docker exec crypto-data-service_redis_1 redis-cli ping 2>&1
    if ($result -like "*PONG*") {
        Write-Color "✅ Redis está respondendo" $GREEN
    } else {
        Write-Color "❌ Redis não está respondendo" $RED
    }
} catch {
    Write-Color "❌ Erro ao testar Redis" $RED
}

# Teste MinIO
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Color "✅ MinIO está respondendo" $GREEN
    }
} catch {
    Write-Color "❌ MinIO não está respondendo" $RED
}

Write-Color "" $BLUE
Write-Color "📊 Resumo dos serviços disponíveis:" $BLUE
Write-Color "   🔹 Milvus (Banco Vetorial): http://localhost:19530" $BLUE
Write-Color "   🔹 Milvus Web UI: http://localhost:9091" $BLUE
Write-Color "   🔹 Redis (Cache): localhost:6379" $BLUE
Write-Color "   🔹 Ollama (LLM): http://localhost:11434" $BLUE
Write-Color "   🔹 MinIO Console: http://localhost:9001" $BLUE

Write-Color "" $GREEN
Write-Color "🎉 Setup de desenvolvimento testado!" $GREEN
Write-Color "💡 Próximos passos:" $YELLOW
Write-Color "   1. Execute: .\dev-mode.ps1 -Mode backend" $YELLOW
Write-Color "   2. Em outro terminal: .\dev-mode.ps1 -Mode frontend" $YELLOW
Write-Color "   3. Ou tudo de uma vez: .\dev-mode.ps1" $YELLOW 