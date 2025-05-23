# Script para rodar em modo de desenvolvimento
# Os serviços (Milvus, Redis, Ollama) rodam no Docker
# O backend e frontend rodam localmente

param(
    [string]$Mode = "full",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Uso: .\dev-mode.ps1 [OPCOES]

OPCOES:
    -Mode <modo>    Modo de execução:
                    - services: Apenas iniciar os serviços Docker
                    - backend: Apenas iniciar o backend
                    - frontend: Apenas iniciar o frontend  
                    - full: Iniciar tudo (padrão)
    -Help           Mostrar esta ajuda

EXEMPLOS:
    .\dev-mode.ps1                    # Iniciar tudo
    .\dev-mode.ps1 -Mode services     # Apenas serviços Docker
    .\dev-mode.ps1 -Mode backend      # Apenas backend local
    .\dev-mode.ps1 -Mode frontend     # Apenas frontend local
"@
    exit 0
}

$GREEN = "Green"
$YELLOW = "Yellow"
$RED = "Red"
$BLUE = "Cyan"

function Write-Color($Message, $Color) {
    Write-Host $Message -ForegroundColor $Color
}

function Start-Services {
    Write-Color "🚀 Iniciando serviços de infraestrutura..." $BLUE
    docker-compose -f docker-compose.services.yml up -d
    
    Write-Color "⏳ Aguardando serviços iniciarem..." $YELLOW
    Start-Sleep -Seconds 10
    
    # Verificar se os serviços estão rodando
    $services = @("milvus", "redis", "ollama", "etcd", "minio")
    foreach ($service in $services) {
        $running = docker ps --filter "name=$service" --format "table {{.Names}}" | Select-String $service
        if ($running) {
            Write-Color "✅ $service está rodando" $GREEN
        } else {
            Write-Color "❌ $service não está rodando" $RED
        }
    }
    
    # Tentar fazer download do modelo do Ollama
    Write-Color "📥 Fazendo download do modelo llama3 no Ollama..." $YELLOW
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/pull" -Method Post -ContentType "application/json" -Body '{"name":"llama3"}' -ErrorAction SilentlyContinue
        Write-Color "✅ Modelo llama3 baixado com sucesso" $GREEN
    } catch {
        Write-Color "⚠️  Erro ao baixar modelo llama3. Você pode tentar manualmente depois." $YELLOW
    }
}

function Start-Backend {
    Write-Color "🔧 Iniciando backend em modo desenvolvimento..." $BLUE
    # Copiar arquivo de configuração de desenvolvimento
    if (Test-Path "dev.env") {
        Copy-Item "dev.env" ".env" -Force
        Write-Color "✅ Configurações de desenvolvimento carregadas" $GREEN
    }
    
    # Iniciar backend
    npm run dev:backend
}

function Start-Frontend {
    Write-Color "🎨 Iniciando frontend em modo desenvolvimento..." $BLUE
    npm run dev:frontend
}

function Start-All {
    Start-Services
    Write-Color "⏳ Aguardando serviços estabilizarem..." $YELLOW
    Start-Sleep -Seconds 15
    
    # Copiar arquivo de configuração de desenvolvimento
    if (Test-Path "dev.env") {
        Copy-Item "dev.env" ".env" -Force
        Write-Color "✅ Configurações de desenvolvimento carregadas" $GREEN
    }
    
    Write-Color "🚀 Iniciando aplicação completa..." $BLUE
    npm run dev:full
}

# Verificar se Docker está rodando
try {
    docker version | Out-Null
} catch {
    Write-Color "❌ Docker não está rodando. Por favor, inicie o Docker Desktop." $RED
    exit 1
}

# Verificar se npm está disponível
try {
    npm --version | Out-Null
} catch {
    Write-Color "❌ NPM não encontrado. Por favor, instale o Node.js." $RED
    exit 1
}

Write-Color "🎯 Modo de desenvolvimento: $Mode" $BLUE

switch ($Mode.ToLower()) {
    "services" { Start-Services }
    "backend" { Start-Backend }
    "frontend" { Start-Frontend }
    "full" { Start-All }
    default {
        Write-Color "❌ Modo inválido: $Mode" $RED
        Write-Color "Use -Help para ver os modos disponíveis" $YELLOW
        exit 1
    }
} 