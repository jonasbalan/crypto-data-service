# 🚀 Guia de Desenvolvimento Local

Este guia explica como executar o projeto em modo de desenvolvimento, onde os **serviços de infraestrutura** (Milvus, Redis, Ollama, etc.) rodam no **Docker**, mas o **frontend e backend** rodam **localmente** para facilitar o desenvolvimento e debugging.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Docker Desktop instalado e rodando
- Git
- PowerShell (Windows) ou Bash (Linux/Mac)

## 🏗️ Arquitetura de Desenvolvimento

```
┌─────────────────────────────────────────────────────────────┐
│                    MODO DESENVOLVIMENTO                     │
├─────────────────────────────────────────────────────────────┤
│  🐳 DOCKER (Serviços de Infraestrutura)                   │
│  ├── Milvus (Banco Vetorial) - :19530                     │
│  ├── Redis (Cache) - :6379                                │
│  ├── Ollama (LLM Local) - :11434                          │
│  ├── Etcd (Milvus dependency) - :2379                     │
│  └── MinIO (Milvus storage) - :9000, :9001               │
├─────────────────────────────────────────────────────────────┤
│  💻 LOCAL (Aplicação)                                      │
│  ├── Backend (Express.js) - :3000                         │
│  └── Frontend (React) - :3001 (webpack-dev-server)       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Início Rápido

### Opção 1: Tudo de uma vez (Recomendado)

**Windows (PowerShell):**
```powershell
.\dev-mode.ps1
```

**Linux/Mac (Bash):**
```bash
./dev-mode.sh
```

### Opção 2: Por partes

#### 1. Iniciar apenas os serviços Docker

**Windows:**
```powershell
.\dev-mode.ps1 -Mode services
```

**Linux/Mac:**
```bash
./dev-mode.sh services
```

#### 2. Em outro terminal, iniciar o backend

**Windows:**
```powershell
.\dev-mode.ps1 -Mode backend
```

**Linux/Mac:**
```bash
./dev-mode.sh backend
```

#### 3. Em outro terminal, iniciar o frontend

**Windows:**
```powershell
.\dev-mode.ps1 -Mode frontend
```

**Linux/Mac:**
```bash
./dev-mode.sh frontend
```

## 📦 Scripts NPM Disponíveis

```bash
# Serviços Docker
npm run services:up      # Iniciar todos os serviços
npm run services:down    # Parar todos os serviços  
npm run services:logs    # Ver logs dos serviços

# Desenvolvimento
npm run dev:backend      # Iniciar backend local
npm run dev:frontend     # Iniciar frontend local
npm run dev:full         # Iniciar backend + frontend
npm run dev:services     # Iniciar serviços + baixar modelo

# Utilitários
npm run pull:model       # Baixar modelo llama3 no Ollama
```

## 🔧 Configuração

### Arquivo de Configuração

O projeto utiliza o arquivo `dev.env` para configurações de desenvolvimento:

```env
# Principais configurações para desenvolvimento local
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Serviços apontam para localhost (containers Docker)
MILVUS_HOST=localhost
MILVUS_PORT=19530
REDIS_HOST=localhost
REDIS_PORT=6379
OLLAMA_HOST=localhost
OLLAMA_PORT=11434

# Configurações de desenvolvimento
SKIP_DATABASE_CONNECTION=false
HOT_RELOAD=true
WEBPACK_DEV_SERVER=true
```

Este arquivo é automaticamente copiado para `.env` quando você executa os scripts de desenvolvimento.

## 🔍 Verificação dos Serviços

### Portas e URLs importantes:

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001 (quando rodando com webpack-dev-server)
- **API Docs**: http://localhost:3000/api-docs
- **Milvus**: http://localhost:19530
- **Milvus Web UI**: http://localhost:9091
- **Redis**: localhost:6379
- **Ollama**: http://localhost:11434
- **MinIO Console**: http://localhost:9001

### Health Checks:

```bash
# Verificar API do backend
curl http://localhost:3000/api/v1/health

# Verificar Ollama
curl http://localhost:11434/api/version

# Verificar Redis
docker exec -it crypto-data-service_redis_1 redis-cli ping

# Verificar Milvus
curl http://localhost:9091/healthz
```

## 🐛 Debugging

### Logs dos Serviços Docker

```bash
# Ver todos os logs
npm run services:logs

# Ver logs de um serviço específico
docker-compose -f docker-compose.services.yml logs -f milvus
docker-compose -f docker-compose.services.yml logs -f redis
docker-compose -f docker-compose.services.yml logs -f ollama
```

### Problemas Comuns

#### 1. Erro de conexão com Milvus
- Aguarde alguns minutos após iniciar os serviços
- Milvus demora para inicializar completamente
- Verifique se todas as dependências (etcd, minio) estão rodando

#### 2. Modelo do Ollama não encontrado
```bash
# Baixar modelo manualmente
curl -X POST http://localhost:11434/api/pull -H "Content-Type: application/json" -d '{"name":"llama3"}'
```

#### 3. Portas em uso
- Verifique se as portas não estão sendo usadas por outros processos
- Use `netstat -ano | findstr :3000` (Windows) ou `lsof -i :3000` (Linux/Mac)

#### 4. Docker não está rodando
- Inicie o Docker Desktop
- Verifique com `docker version`

## 🔄 Desenvolvimento Workflow

### Workflow Típico:

1. **Iniciar serviços**: Execute `.\dev-mode.ps1 -Mode services` uma vez
2. **Desenvolver**: Inicie backend e/ou frontend conforme necessário
3. **Hot Reload**: Mudanças no código são refletidas automaticamente
4. **Debug**: Use ferramentas do navegador e logs do console
5. **Testes**: Execute `npm test` quando necessário

### Vantagens desta Abordagem:

✅ **Hot Reload**: Mudanças refletidas instantaneamente
✅ **Debugging**: Acesso completo às ferramentas de debug
✅ **Performance**: Melhor performance que containers para desenvolvimento
✅ **Flexibilidade**: Pode rodar apenas o que precisa
✅ **Logs Claros**: Logs separados entre serviços e aplicação

## 🧪 Testando a Configuração

Execute este teste rápido para verificar se tudo está funcionando:

**Windows:**
```powershell
# Iniciar serviços
.\dev-mode.ps1 -Mode services

# Aguardar 30 segundos e testar APIs
Start-Sleep -Seconds 30
Invoke-WebRequest http://localhost:11434/api/version
Invoke-WebRequest http://localhost:9091/healthz
```

**Linux/Mac:**
```bash
# Iniciar serviços
./dev-mode.sh services

# Aguardar 30 segundos e testar APIs
sleep 30
curl http://localhost:11434/api/version
curl http://localhost:9091/healthz
```

## 📚 Próximos Passos

1. Configure suas chaves de API no arquivo `dev.env`
2. Execute `npm run dev:full` para iniciar desenvolvimento
3. Acesse http://localhost:3000/api-docs para ver a documentação da API
4. Comece a desenvolver! 🎉

## 🔗 Links Úteis

- [Documentação Milvus](https://milvus.io/docs)
- [Documentação Ollama](https://ollama.ai/docs)
- [Documentação Redis](https://redis.io/docs)
- [Documentação Docker Compose](https://docs.docker.com/compose/)

---

**💡 Dica**: Use `.\dev-mode.ps1 -Help` ou `./dev-mode.sh help` para ver todas as opções disponíveis! 