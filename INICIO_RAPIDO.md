# 🚀 Início Rápido - Crypto Data Service

## ⚡ Inicialização Simples (Sem Docker)

### Pré-requisitos
- Node.js 18+ instalado
- Conexão com internet (para APIs externas)

### 🎯 Início em 3 Passos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar sistema completo
node start-without-docker.js
```

**Pronto!** O sistema estará rodando em:
- 🌐 **Frontend**: http://localhost:3000
- 📊 **API**: http://localhost:3000/api
- 🔍 **Health**: http://localhost:3000/health

## 📊 Dados Reais Disponíveis

### ✅ O que funciona AGORA:
- **Preços em tempo real** via CoinGecko API
- **Trending coins** com dados atualizados
- **Notícias** de 6 fontes RSS confiáveis
- **Análise de sentimento** baseada em dados reais
- **Dashboard** com informações ao vivo
- **Múltiplas criptomoedas** (BTC, ETH, ADA, SOL, etc.)

### 🔗 Endpoints Principais

```bash
# Dados de uma criptomoeda
GET /api/crypto/BTC/real

# Trending coins
GET /api/trending/real

# Múltiplas moedas
POST /api/crypto/multiple/real
Body: {"symbols": ["BTC", "ETH", "ADA"]}

# Notícias
GET /api/news/real?symbol=BTC

# Sentimento do mercado
GET /api/market/sentiment/real

# Análise de sentimento específica
GET /api/sentiment/BTC
GET /api/sentiment/BTC/summary
```

## 🎨 Interface Web

### Dashboard Principal
- **Trending Coins**: Moedas em alta com dados reais
- **Análise de Sentimento**: Baseada em preços e notícias
- **Navegação**: Acesso rápido a todas as funcionalidades

### Páginas Disponíveis
- `/` - Dashboard principal
- `/sentiment-analysis` - Análise detalhada de sentimento
- `/technical-indicators` - Indicadores técnicos
- `/metrics` - Métricas do sistema
- `/news` - Feed de notícias

## 🔧 Configuração Avançada

### APIs Opcionais
```bash
# No arquivo .env (criado automaticamente)
COINGECKO_API_KEY=sua-chave-aqui  # Para mais requests
NEWS_API_KEY=sua-chave-aqui       # Para mais fontes de notícias
```

### Modo de Desenvolvimento
```bash
# Backend apenas
npm run dev

# Frontend apenas  
npm run dev:frontend

# Ambos simultaneamente
npm run dev:full
```

## 📈 Funcionalidades Implementadas

### ✅ Dados Reais
- [x] Preços de criptomoedas (CoinGecko)
- [x] Volume e market cap
- [x] Variação 24h
- [x] Trending coins
- [x] Notícias RSS (6 fontes)
- [x] Análise de sentimento

### ✅ APIs Funcionais
- [x] REST API completa
- [x] Endpoints de dados reais
- [x] Sistema de cache
- [x] Tratamento de erros
- [x] Fallbacks automáticos

### ✅ Frontend Integrado
- [x] Dashboard responsivo
- [x] Dados em tempo real
- [x] Navegação completa
- [x] Componentes reutilizáveis
- [x] Tratamento de estados

## 🚨 Solução de Problemas

### Erro de Porta
```bash
# Se a porta 3000 estiver ocupada
PORT=3001 node start-without-docker.js
```

### Erro de Dependências
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro de Compilação
```bash
# Compilar manualmente
npm run build:backend
npm run build:frontend
npm start
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

### Estatísticas do Sistema
```bash
curl http://localhost:3000/api/system/stats
```

### Logs
- Logs detalhados no console
- Rastreamento de APIs externas
- Monitoramento de cache

## 🎯 Próximos Passos

1. **Teste o Dashboard**: Acesse http://localhost:3000
2. **Explore as APIs**: Use os endpoints listados acima
3. **Verifique os dados**: Compare com sites como CoinGecko
4. **Personalize**: Adicione suas APIs keys para mais recursos

---

**🎉 Parabéns!** Você agora tem acesso a dados reais de criptomoedas através de uma interface moderna e APIs robustas.

Para dúvidas ou problemas, verifique os logs no console ou consulte a documentação completa. 