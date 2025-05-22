#!/bin/bash

# Cores para feedback visual
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando teste completo do sistema Crypto Data Service...${NC}"

# Verificar dependências
echo -e "\n${YELLOW}Verificando dependências instaladas...${NC}"

DEPENDENCIES=("docker" "docker-compose" "curl" "node")
MISSING_DEPS=0

for dep in "${DEPENDENCIES[@]}"; do
  if command -v $dep &> /dev/null; then
    echo -e "${GREEN}✓ $dep encontrado${NC}"
  else
    echo -e "${RED}✗ $dep não encontrado${NC}"
    MISSING_DEPS=1
  fi
done

if [ $MISSING_DEPS -eq 1 ]; then
  echo -e "${RED}Por favor, instale as dependências faltantes antes de continuar.${NC}"
  exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node --version)
echo -e "${GREEN}Versão do Node.js: $NODE_VERSION${NC}"

# Verificar pacotes instalados
echo -e "\n${YELLOW}Verificando pacotes npm instalados...${NC}"
if [ -f "package.json" ]; then
  # Verificar se TensorFlow está instalado
  if grep -q "@tensorflow/tfjs-node" package.json; then
    echo -e "${GREEN}✓ TensorFlow.js encontrado em package.json${NC}"
  else
    echo -e "${RED}✗ TensorFlow.js não encontrado em package.json${NC}"
    echo -e "${YELLOW}Instalando TensorFlow.js...${NC}"
    npm install @tensorflow/tfjs-node --save
  fi
  
  # Verificar se há pacotes desatualizados
  echo -e "\n${YELLOW}Verificando pacotes desatualizados...${NC}"
  npm outdated
else
  echo -e "${RED}✗ package.json não encontrado${NC}"
  exit 1
fi

# Compilar o projeto
echo -e "\n${YELLOW}Compilando o projeto...${NC}"
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Compilação bem-sucedida${NC}"
else
  echo -e "${RED}✗ Falha na compilação${NC}"
  exit 1
fi

# Iniciar serviços Docker
echo -e "\n${YELLOW}Iniciando serviços Docker...${NC}"
docker-compose up -d

# Esperar os serviços iniciarem
echo -e "${YELLOW}Aguardando serviços iniciarem...${NC}"
sleep 10

# Verificar se todos os contêineres estão rodando
echo -e "\n${YELLOW}Verificando status dos contêineres...${NC}"
CONTAINERS=("crypto-data-service_app_1" "crypto-data-service_milvus_1" "crypto-data-service_redis_1" "crypto-data-service_etcd_1" "crypto-data-service_minio_1" "crypto-data-service_ollama_1")

for container in "${CONTAINERS[@]}"; do
  if docker ps | grep -q $container; then
    echo -e "${GREEN}✓ $container está rodando${NC}"
  else
    echo -e "${RED}✗ $container não está rodando${NC}"
  fi
done

# Verificar APIs
echo -e "\n${YELLOW}Testando APIs...${NC}"
API_ENDPOINTS=("/api/v1/health" "/api/v1/metrics" "/api/docs")

for endpoint in "${API_ENDPOINTS[@]}"; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$endpoint)
  if [ "$RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ $endpoint retornou status 200${NC}"
  else
    echo -e "${RED}✗ $endpoint retornou status $RESPONSE${NC}"
  fi
done

# Testar modelo ML
echo -e "\n${YELLOW}Testando modelo de previsão...${NC}"
PREDICTION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/predict -H "Content-Type: application/json" -d '{"symbol":"BTC","days":1}')

if [[ $PREDICTION_RESPONSE == *"predictedPrice"* ]]; then
  echo -e "${GREEN}✓ API de previsão funcionando corretamente${NC}"
  echo -e "${YELLOW}Resposta: $PREDICTION_RESPONSE${NC}"
else
  echo -e "${RED}✗ Falha na API de previsão${NC}"
  echo -e "${YELLOW}Resposta: $PREDICTION_RESPONSE${NC}"
fi

# Executar testes automatizados
echo -e "\n${YELLOW}Executando testes automatizados...${NC}"
npm test

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Todos os testes passaram${NC}"
else
  echo -e "${RED}✗ Alguns testes falharam${NC}"
fi

echo -e "\n${GREEN}Teste do sistema concluído!${NC}"
echo -e "${YELLOW}Para parar os serviços, execute: docker-compose down${NC}" 