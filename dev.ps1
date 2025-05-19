# Iniciar os containers Docker
Write-Host "Iniciando containers Docker..." -ForegroundColor Green
docker-compose up -d

# Aguardar os serviços estarem prontos
Write-Host "Aguardando serviços iniciarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Instalar dependências se necessário
Write-Host "Verificando dependências..." -ForegroundColor Yellow
npm install

# Iniciar o servidor em modo de desenvolvimento
Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Green
$env:PORT=3001
npm run dev 