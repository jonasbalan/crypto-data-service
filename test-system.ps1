# Script para testar o sistema Crypto Data Service (Windows)

# Definir cores
$GREEN = "Green"
$RED = "Red"
$YELLOW = "Yellow"

# Função para mensagens coloridas
function Write-Color($Message, $Color) {
    Write-Host $Message -ForegroundColor $Color
}

Write-Color "Iniciando teste completo do sistema Crypto Data Service..." $YELLOW

# Verificar dependências
Write-Color "Verificando dependências instaladas..." $YELLOW

$dependencies = @("docker", "node", "curl")
$missingDeps = $false

foreach ($dep in $dependencies) {
    if (Get-Command $dep -ErrorAction SilentlyContinue) {
        Write-Color "✓ $dep encontrado" $GREEN
    } else {
        Write-Color "✗ $dep não encontrado" $RED
        $missingDeps = $true
    }
}

if ($missingDeps) {
    Write-Color "Por favor, instale as dependências faltantes antes de continuar." $RED
    exit 1
}

# Verificar versão do Node.js
$nodeVersion = (node --version)
Write-Color "Versão do Node.js: $nodeVersion" $GREEN

# Verificar pacotes instalados
Write-Color "Verificando pacotes npm instalados..." $YELLOW
if (Test-Path "package.json") {
    # Verificar se TensorFlow está instalado
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.PSObject.Properties.Name -contains "@tensorflow/tfjs-node") {
        Write-Color "✓ TensorFlow.js encontrado em package.json" $GREEN
    } else {
        Write-Color "✗ TensorFlow.js não encontrado em package.json" $RED
        Write-Color "Instalando TensorFlow.js..." $YELLOW
        npm install @tensorflow/tfjs-node --save
    }
    
    # Verificar se há pacotes desatualizados
    Write-Color "Verificando pacotes desatualizados..." $YELLOW
    npm outdated
} else {
    Write-Color "✗ package.json não encontrado" $RED
    exit 1
}

# Compilar o projeto
Write-Color "Compilando o projeto..." $YELLOW
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Color "✓ Compilação bem-sucedida" $GREEN
} else {
    Write-Color "✗ Falha na compilação" $RED
    exit 1
}

# Iniciar serviços Docker
Write-Color "Iniciando serviços Docker..." $YELLOW
docker-compose up -d

# Esperar os serviços iniciarem
Write-Color "Aguardando serviços iniciarem..." $YELLOW
Start-Sleep -Seconds 10

# Verificar contêineres
Write-Color "Verificando status dos contêineres..." $YELLOW
$containers = @("crypto-data-service_app_1", "crypto-data-service_milvus_1", "crypto-data-service_redis_1", "crypto-data-service_etcd_1", "crypto-data-service_minio_1", "crypto-data-service_ollama_1")

foreach ($container in $containers) {
    $running = docker ps | Select-String -Pattern $container
    if ($running) {
        Write-Color "✓ $container está rodando" $GREEN
    } else {
        Write-Color "✗ $container não está rodando" $RED
    }
}

# Verificar APIs
Write-Color "Testando APIs..." $YELLOW
$apiEndpoints = @("/api/v1/health", "/api/v1/metrics", "/api/docs")

foreach ($endpoint in $apiEndpoints) {
    $success = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000$endpoint" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $success = $true
        }
    } catch {
        $success = $false
    }
    
    if ($success) {
        Write-Color "✓ $endpoint retornou status 200" $GREEN
    } else {
        Write-Color "✗ $endpoint falhou" $RED
    }
}

# Testar modelo ML
Write-Color "Testando modelo de previsão..." $YELLOW
$success = $false
try {
    $predictionResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/predict" -Method Post -ContentType "application/json" -Body '{"symbol":"BTC","days":1}' -UseBasicParsing -ErrorAction SilentlyContinue
    if ($predictionResponse.predictedPrice) {
        $success = $true
    }
} catch {
    $success = $false
}

if ($success) {
    Write-Color "✓ API de previsão funcionando corretamente" $GREEN
} else {
    Write-Color "✗ Falha na API de previsão" $RED
}

# Executar testes automatizados
Write-Color "Executando testes automatizados..." $YELLOW
npm test

if ($LASTEXITCODE -eq 0) {
    Write-Color "✓ Todos os testes passaram" $GREEN
} else {
    Write-Color "✗ Alguns testes falharam" $RED
}

Write-Color "Teste do sistema concluído!" $GREEN
Write-Color "Para parar os serviços, execute: docker-compose down" $YELLOW 