#!/bin/bash

# Iniciar os containers Docker
echo "Iniciando containers Docker..."
docker-compose up -d

# Aguardar os serviços estarem prontos
echo "Aguardando serviços iniciarem..."
sleep 10

# Instalar dependências se necessário
echo "Verificando dependências..."
npm install

# Iniciar o servidor em modo de desenvolvimento
echo "Iniciando servidor de desenvolvimento..."
npm run dev 