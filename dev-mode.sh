#!/bin/bash

# Script para rodar em modo de desenvolvimento
# Os serviços (Milvus, Redis, Ollama) rodam no Docker
# O backend e frontend rodam localmente

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

function show_help() {
    echo "Uso: ./dev-mode.sh [OPCOES]"
    echo ""
    echo "OPCOES:"
    echo "    services    Apenas iniciar os serviços Docker"
    echo "    backend     Apenas iniciar o backend"
    echo "    frontend    Apenas iniciar o frontend"
    echo "    full        Iniciar tudo (padrão)"
    echo "    help        Mostrar esta ajuda"
    echo ""
    echo "EXEMPLOS:"
    echo "    ./dev-mode.sh              # Iniciar tudo"
    echo "    ./dev-mode.sh services     # Apenas serviços Docker"
    echo "    ./dev-mode.sh backend      # Apenas backend local"
    echo "    ./dev-mode.sh frontend     # Apenas frontend local"
}

function print_color() {
    printf "${2}${1}${NC}\n"
}

function start_services() {
    print_color "🚀 Iniciando serviços de infraestrutura..." $BLUE
    docker-compose -f docker-compose.services.yml up -d
    
    print_color "⏳ Aguardando serviços iniciarem..." $YELLOW
    sleep 10
    
    # Verificar se os serviços estão rodando
    services=("milvus" "redis" "ollama" "etcd" "minio")
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --format "table {{.Names}}" | grep -q $service; then
            print_color "✅ $service está rodando" $GREEN
        else
            print_color "❌ $service não está rodando" $RED
        fi
    done
    
    # Tentar fazer download do modelo do Ollama
    print_color "📥 Fazendo download do modelo llama3 no Ollama..." $YELLOW
    if curl -s -X POST http://localhost:11434/api/pull -H "Content-Type: application/json" -d '{"name":"llama3"}' > /dev/null 2>&1; then
        print_color "✅ Modelo llama3 baixado com sucesso" $GREEN
    else
        print_color "⚠️  Erro ao baixar modelo llama3. Você pode tentar manualmente depois." $YELLOW
    fi
}

function start_backend() {
    print_color "🔧 Iniciando backend em modo desenvolvimento..." $BLUE
    # Copiar arquivo de configuração de desenvolvimento
    if [ -f "dev.env" ]; then
        cp dev.env .env
        print_color "✅ Configurações de desenvolvimento carregadas" $GREEN
    fi
    
    # Iniciar backend
    npm run dev:backend
}

function start_frontend() {
    print_color "🎨 Iniciando frontend em modo desenvolvimento..." $BLUE
    npm run dev:frontend
}

function start_all() {
    start_services
    print_color "⏳ Aguardando serviços estabilizarem..." $YELLOW
    sleep 15
    
    # Copiar arquivo de configuração de desenvolvimento
    if [ -f "dev.env" ]; then
        cp dev.env .env
        print_color "✅ Configurações de desenvolvimento carregadas" $GREEN
    fi
    
    print_color "🚀 Iniciando aplicação completa..." $BLUE
    npm run dev:full
}

# Verificar se Docker está rodando
if ! docker version > /dev/null 2>&1; then
    print_color "❌ Docker não está rodando. Por favor, inicie o Docker." $RED
    exit 1
fi

# Verificar se npm está disponível
if ! npm --version > /dev/null 2>&1; then
    print_color "❌ NPM não encontrado. Por favor, instale o Node.js." $RED
    exit 1
fi

# Determinar modo
MODE=${1:-full}
print_color "🎯 Modo de desenvolvimento: $MODE" $BLUE

case $MODE in
    "services")
        start_services
        ;;
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "full")
        start_all
        ;;
    "help")
        show_help
        ;;
    *)
        print_color "❌ Modo inválido: $MODE" $RED
        print_color "Use 'help' para ver os modos disponíveis" $YELLOW
        exit 1
        ;;
esac 