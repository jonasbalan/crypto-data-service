# 📋 Referência de Comandos

## ⚡ Comando Principal

```bash
# 🚀 COMANDO MÁGICO: Faz tudo automaticamente!
npm run dev:mode
```

## 🛠️ Comandos NPM por Categoria

### 🔧 Setup e Configuração
```bash
npm run dev:setup         # Configura serviços Docker + ambiente
npm run dev:config         # Apenas copia dev.env para .env
```

### 🚀 Execução
```bash
npm run dev:mode           # Setup completo + backend + frontend
npm run dev:start          # Apenas backend + frontend
npm run dev:backend        # Apenas backend
npm run dev:frontend       # Apenas frontend
```

### 🐳 Serviços Docker
```bash
npm run services:up        # Iniciar todos os serviços Docker
npm run services:down      # Parar todos os serviços Docker
npm run services:logs      # Ver logs de todos os serviços
```

### 🧪 Testes
```bash
npm test                  # Executar todos os testes
npm run test:watch        # Testes em modo watch
npm run test:coverage     # Testes com coverage
```

## 🌐 URLs Importantes

```bash
http://localhost:3000              # Backend API
http://localhost:3001              # Frontend
http://localhost:3000/api-docs     # Documentação da API
http://localhost:9091              # Milvus Web UI
http://localhost:11434             # Ollama API
```

---

**💡 Comando mais importante: `npm run dev:mode`** 🚀 