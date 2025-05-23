# ⚡ Início Rápido - Modo Desenvolvimento

## 🎯 Objetivo

Executar o **frontend e backend localmente** para desenvolvimento, enquanto os **serviços de infraestrutura** (Milvus, Redis, Ollama) rodam no **Docker**.

## 🚀 Comandos Rápidos

### ⚡ Super Simples (Funciona em qualquer OS)

```bash
# Comando único que faz TUDO!
npm run dev:mode
```

### 🛠️ Opções Avançadas

**NPM (Multiplataforma):**
```bash
npm run dev:mode          # ⚡ Tudo automatizado
npm run dev:setup         # 🔧 Apenas setup dos serviços
npm run dev:start         # 🚀 Apenas backend + frontend
npm run services:up       # 🐳 Apenas serviços Docker
```

**Scripts PowerShell/Bash (Alternativa):**

**Windows (PowerShell):**
```powershell
.\dev-mode.ps1            # Tudo de uma vez
.\dev-mode.ps1 -Mode services    # Apenas serviços
.\test-dev-setup.ps1      # Testar configuração
```

**Linux/Mac (Bash):**
```bash
./dev-mode.sh             # Tudo de uma vez
./dev-mode.sh services    # Apenas serviços
```

## 📋 Pré-requisitos

- ✅ Docker Desktop instalado e rodando
- ✅ Node.js 18+ instalado
- ✅ `npm install` executado

## 🌐 URLs Importantes

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Backend API** | http://localhost:3000 | API principal |
| **Frontend** | http://localhost:3001 | Interface web |
| **API Docs** | http://localhost:3000/api-docs | Documentação Swagger |
| **Milvus Web UI** | http://localhost:9091 | Interface do Milvus |
| **MinIO Console** | http://localhost:9001 | Interface do MinIO |
| **Ollama** | http://localhost:11434 | API do Ollama |

## 🔧 Scripts NPM Úteis

```bash
npm run dev:mode          # ⚡ Setup completo + backend + frontend
npm run dev:setup         # 🔧 Apenas configurar serviços
npm run dev:start         # 🚀 Apenas backend + frontend
npm run services:up       # ⬆️  Iniciar serviços Docker
npm run services:down     # ⬇️  Parar serviços Docker
npm run services:logs     # 📋 Ver logs dos serviços
npm run dev:backend       # 🔧 Apenas backend local
npm run dev:frontend      # 🎨 Apenas frontend local
```

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| **Docker não roda** | Inicie o Docker Desktop |
| **Porta ocupada** | `netstat -ano \| findstr :3000` e mate o processo |
| **Milvus não conecta** | Aguarde 2-3 minutos após `docker-compose up` |
| **Modelo Ollama não encontrado** | `npm run pull:model` |

## 🎬 Exemplo de Uso

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar modo desenvolvimento (comando único!)
npm run dev:mode

# 3. Aguardar as mensagens de sucesso e acessar:
#    - Backend: http://localhost:3000
#    - Frontend: http://localhost:3001
```

## 📚 Documentação Completa

- 📖 **[README.DEV.md](README.DEV.md)** - Guia completo de desenvolvimento
- 📖 **[README.md](README.md)** - Documentação principal do projeto

---

**💡 Dica**: O comando `npm run dev:mode` faz tudo automaticamente:
1. ✅ Verifica se Docker está rodando
2. 🐳 Inicia serviços Docker se necessário
3. ⏳ Aguarda serviços estabilizarem
4. 🔧 Copia configurações de desenvolvimento
5. 🧪 Testa conectividade dos serviços
6. 📥 Baixa modelo do Ollama em background
7. 🚀 Inicia backend e frontend simultaneamente 