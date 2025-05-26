# 🚀 Crypto Data Service

[![CI/CD](https://github.com/jonasbalan/crypt_data_service/workflows/Crypto%20Data%20Service%20CI/CD/badge.svg)](https://github.com/jonasbalan/crypt_data_service/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

Serviço avançado de análise de dados de criptomoedas com análise de sentimento em tempo real, análise técnica e previsão de preços usando IA.

## 📋 Visão Geral

Este projeto implementa um sistema completo de análise de mercado de criptomoedas que:

- 📊 **Coleta dados em tempo real** de múltiplas exchanges (Binance, Coinbase)
- 🧠 **Processa com IA** usando modelos de linguagem locais (Ollama) ou em nuvem (OpenAI)
- 🔍 **Armazena em banco vetorial** (Milvus) para busca por similaridade
- 📈 **Análise técnica avançada** com indicadores personalizados
- 📰 **Análise de sentimento** de notícias e mídias sociais
- 🌐 **Interface web moderna** com React e Material-UI
- 🚀 **API REST completa** com documentação Swagger
- 📊 **Monitoramento em tempo real** com métricas Prometheus

## 🎯 Funcionalidades Principais

### 📈 Análise de Mercado
- Coleta de dados OHLCV em tempo real
- Indicadores técnicos (RSI, MACD, Bollinger Bands)
- Detecção de padrões de candlestick
- Análise de volume e liquidez

### 🧠 Inteligência Artificial
- Embeddings de dados usando OpenAI ou Ollama local
- Análise de sentimento de notícias
- Previsão de preços com modelos ML
- Busca semântica em dados históricos

### 🌐 Interface Web
- Dashboard interativo em tempo real
- Gráficos avançados com Chart.js
- Sistema de alertas e notificações
- Interface responsiva e moderna

### 🔧 Infraestrutura
- Arquitetura baseada em microserviços
- Cache Redis para otimização
- Banco vetorial Milvus para dados
- Sistema de logs e métricas

## 🛠️ Stack Tecnológica

### Backend
- **Node.js** com TypeScript
- **Express.js** para API REST
- **WebSocket** para dados em tempo real
- **Jest** para testes automatizados

### Frontend
- **React** com TypeScript
- **Material-UI** para componentes
- **Chart.js** para visualizações
- **Axios** para requisições HTTP

### Banco de Dados
- **Milvus** - Banco vetorial para embeddings
- **Redis** - Cache e sessões
- **MinIO** - Armazenamento de objetos

### DevOps & Monitoramento
- **Docker** e **Docker Compose**
- **GitHub Actions** para CI/CD
- **Prometheus** para métricas
- **ESLint** e **Prettier** para qualidade de código

### IA/ML
- **Ollama** (local) ou **OpenAI** (nuvem)
- **Modelos suportados**: llama3, gemma, mistral, phi3
- **Embeddings** para análise semântica

## 🚀 Instalação e Configuração

### 📋 Pré-requisitos

- **Node.js** 18+ 
- **Docker** e **Docker Compose**
- **Git**
- **GPU** (opcional, para melhor performance do Ollama)

### 🎯 Início Rápido (Recomendado)

1. **Clone o repositório:**
```bash
git clone https://github.com/jonasbalan/crypt_data_service.git
cd crypt_data_service
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure o ambiente:**
```bash
cp example.env .env
# Edite o arquivo .env com suas configurações
```

4. **Inicie o ambiente de desenvolvimento:**
```bash
# Comando único que configura tudo!
npm run dev:mode

# Ou por plataforma:
# Windows: .\dev-mode.ps1
# Linux/Mac: ./dev-mode.sh
```

5. **Acesse a aplicação:**
- 🌐 **Frontend**: http://localhost:3001
- 🔧 **API**: http://localhost:3000
- 📚 **Documentação API**: http://localhost:3000/api-docs
- 📊 **MinIO**: http://localhost:9001
- 📈 **Métricas**: http://localhost:3000/metrics

### 🐳 Instalação Completa com Docker

Para produção ou ambiente isolado:

```bash
# Clone e configure
git clone https://github.com/jonasbalan/crypt_data_service.git
cd crypt_data_service
cp example.env .env

# Inicie todos os serviços
docker-compose up -d

# Verifique o status
docker-compose ps
```

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [🚀 Início Rápido](QUICK_START.md) | Guia para começar rapidamente |
| [👨‍💻 Desenvolvimento](README.DEV.md) | Guia detalhado de desenvolvimento |
| [📊 Controle do Projeto](PROJECT_CONTROL.md) | Status e progresso do projeto |
| [📋 Próximos Passos](NEXT_STEPS.md) | Roadmap e funcionalidades planejadas |
| [🐛 Problemas Conhecidos](PROBLEMAS_IDENTIFICADOS.md) | Issues identificadas e soluções |

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Linting e formatação
npm run lint
npm run format
```

## 📊 Monitoramento

### Métricas Disponíveis
- **API**: Latência, throughput, erros
- **Sistema**: CPU, memória, disco
- **Banco**: Conexões, queries, performance
- **Cache**: Hit rate, tamanho, evictions

### Logs
```bash
# Logs em tempo real
docker-compose logs -f

# Logs específicos
docker-compose logs -f crypto-backend
docker-compose logs -f milvus-standalone
```

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add: amazing feature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### 📋 Diretrizes de Contribuição

- Siga os padrões de código (ESLint/Prettier)
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário
- Use commits semânticos (feat:, fix:, docs:, etc.)

## 🔧 Configuração Avançada

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `EMBEDDING_SERVICE` | Serviço de embeddings (openai/ollama) | `ollama` |
| `OPENAI_API_KEY` | Chave da API OpenAI | - |
| `MILVUS_HOST` | Host do Milvus | `localhost` |
| `REDIS_URL` | URL do Redis | `redis://localhost:6379` |
| `PORT` | Porta do backend | `3000` |
| `FRONTEND_PORT` | Porta do frontend | `3001` |

### Configuração GPU (Ollama)

Para melhor performance com Ollama:

```yaml
# docker-compose.services.yml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## 📈 Status do Projeto

- ✅ **Infraestrutura Docker**: 100%
- ✅ **API Backend**: 85%
- ✅ **Interface Web**: 75%
- 🔄 **Análise IA**: 60%
- 📋 **Documentação**: 80%
- 🧪 **Testes**: 45%

> Veja o [PROJECT_CONTROL.md](PROJECT_CONTROL.md) para detalhes completos

## 📊 Arquitetura

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│   Backend   │────│   Milvus    │
│  (React)    │    │ (Express)   │    │ (Vector DB) │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                    ┌─────────────┐    ┌─────────────┐
                    │    Redis    │    │    MinIO    │
                    │   (Cache)   │    │ (Storage)   │
                    └─────────────┘    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Ollama    │
                    │    (LLM)    │
                    └─────────────┘
```

## 🆘 Suporte

- 📧 **Email**: seu-email@exemplo.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/jonasbalan/crypt_data_service/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/jonasbalan/crypt_data_service/discussions)

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- Equipe do [Milvus](https://milvus.io/) pelo excelente banco vetorial
- Comunidade [Ollama](https://ollama.ai/) pelos modelos locais
- [Material-UI](https://mui.com/) pela biblioteca de componentes
- Todos os contribuidores e testadores

---

⭐ **Se este projeto te ajudou, considere dar uma estrela no GitHub!** 