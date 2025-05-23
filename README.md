# Crypto Data Service

Serviço de análise de dados de criptomoedas com análise de sentimento, análise técnica e previsão de preços.

## 📋 Visão Geral

Este projeto implementa um serviço que coleta dados do mercado crypto, processa e armazena em um banco vetorial para análise através de um agente de IA. O sistema utiliza uma abordagem híbrida de RAG (Retrieval Augmented Generation) e MCP (Modelo de Consulta em Tempo Real) para fornecer análises precisas e em tempo real.

## 🚀 Funcionalidades

- Coleta de dados de múltiplas exchanges (Binance, Coinbase)
- Processamento e vetorização de dados
- API REST para acesso aos dados
- Endpoints MCP para consultas em tempo real
- Sistema de cache para otimização
- Monitoramento e métricas
- Suporte para geração de embeddings com OpenAI ou Ollama (local)

## 🛠️ Tecnologias

- Docker
- Node.js
- Python
- Redis
- Pinecone/Weaviate
- WebSocket
- REST API
- Node.js com TypeScript
- Docker e Docker Compose
- Milvus (banco de dados vetorial)
- Ollama (LLM local) ou OpenAI (LLM em nuvem)
- Express (API REST)
- Prometheus (métricas)
- Jest (testes)

## 📦 Instalação

### 🚀 Desenvolvimento Local (Recomendado)

Para desenvolvimento, onde os serviços ficam no Docker mas o código roda localmente:

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/crypto-data-service.git
cd crypto-data-service
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o ambiente de desenvolvimento:

```bash
# Comando único que faz tudo! (Multiplataforma)
npm run dev:mode
```

**Alternativas por plataforma:**
- **Windows:** `.\dev-mode.ps1`
- **Linux/Mac:** `./dev-mode.sh`

📖 **Veja o [Guia de Desenvolvimento](README.DEV.md) para instruções detalhadas!**
📖 **Veja o [Início Rápido](QUICK_START.md) para começar imediatamente!**

### 🐳 Instalação Completa com Docker

Para produção ou ambiente completo com Docker:

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/crypto-data-service.git
cd crypto-data-service
```

2. Crie um arquivo `.env` baseado no exemplo:
```bash
cp example.env .env
```

3. Configure as variáveis de ambiente no arquivo `.env`

4. Inicie os containers:
```bash
docker-compose up -d
```

5. Execute as migrações:
```bash
npm run migrate
```

## 🧠 Modelos LLM Disponíveis

O projeto suporta duas opções para a geração de embeddings:

### OpenAI (em nuvem)

- Requer uma chave de API da OpenAI
- Melhor qualidade de embeddings
- Configuração: `EMBEDDING_SERVICE=openai` no arquivo `.env`

### Ollama (local)

- Roda localmente dentro de um container Docker
- Não requer chaves de API externas
- Suporta vários modelos (llama3, gemma, etc.)
- Beneficia-se de GPU para melhor desempenho
- Configuração: `EMBEDDING_SERVICE=ollama` no arquivo `.env`

Para usar o Ollama com GPU, certifique-se de que:
- Os drivers NVIDIA estejam instalados no host
- O Docker esteja configurado para suportar GPU
- O docker-compose inclua a configuração de recursos para GPU

## 📚 Documentação

- [Documentação Técnica](docs/TECHNICAL.md)
- [Guia de API](docs/API.md)
- [Guia de Contribuição](docs/CONTRIBUTING.md)

## 📊 Controle do Projeto

O controle do projeto é mantido no arquivo [PROJECT_CONTROL.md](PROJECT_CONTROL.md), que contém:
- Status das sprints
- Histórias e tarefas
- Critérios de aceitação
- Casos de teste
- Métricas de progresso

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📫 Contato

[Seu Nome] - [seu-email@exemplo.com]

Link do Projeto: [https://github.com/seu-usuario/crypto-data-service](https://github.com/seu-usuario/crypto-data-service)

## 📋 Funcionalidades

- Processamento de dados do mercado crypto em vetores
- Armazenamento de vetores no Milvus para busca por similaridade
- API REST para interação com o serviço
- Cache de embeddings usando Redis
- WebSocket para atualizações em tempo real
- Monitoramento com métricas Prometheus
- Documentação da API com Swagger

## 📋 Requisitos

- Node.js 18+
- Docker e Docker Compose
- GPU para melhor desempenho do Ollama (opcional)

## 📋 Desenvolvimento

Para executar em modo de desenvolvimento:

```bash
npm run dev
```

## 📋 Testes

Para executar os testes:

```bash
npm test
```

Para ver a cobertura de testes:

```bash
npm run test:coverage
```

## 📋 Documentação da API

A documentação da API está disponível em:
- http://localhost:3000/api-docs

## 📋 Métricas

As métricas do serviço estão disponíveis em:
- http://localhost:3000/metrics

## 📋 Estrutura do Projeto

```
src/
├── apis/        # Implementações de APIs externas
├── config/      # Configurações da aplicação
├── controllers/ # Controladores da API
├── database/    # Configuração e interação com bancos de dados
├── metrics/     # Métricas de monitoramento
├── middleware/  # Middlewares do Express
├── routes/      # Definição de rotas
├── services/    # Lógica de negócio
│   ├── embeddingService.ts   # Serviço de embeddings (abstração)
│   ├── ollamaService.ts      # Cliente para Ollama local
│   └── cacheService.ts       # Serviço de cache com Redis
├── tests/       # Testes automatizados
├── types/       # Definições de tipos TypeScript
├── utils/       # Utilitários
└── websocket/   # Implementação de WebSocket
```

## 🚚 CI/CD

O projeto utiliza GitHub Actions para:
- Executar testes
- Validar código
- Construir imagens Docker
- Fazer deploy automático

## 📋 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Executando o projeto localmente com dependências no Docker

### 1. Primeiro, inicie as dependências usando Docker Compose

```bash
docker-compose up -d
```

Isso irá iniciar apenas o Redis e o Ollama em contêineres Docker.

### 2. Configure as variáveis de ambiente para execução local

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
# Configurações gerais
NODE_ENV=development
PORT=3000

# Configurações Redis
REDIS_URL=redis://localhost:6379

# Configurações para pular bancos de dados problemáticos
SKIP_DATABASE_CONNECTION=true

# Configurações Ollama
OLLAMA_API_URL=http://localhost:11434
EMBEDDING_SERVICE=ollama
OLLAMA_MODEL=llama2

# Porta para o frontend
FRONTEND_PORT=3001
```

### 3. Instale as dependências do projeto

```bash
npm install
```

### 4. Execute o backend em um terminal

```bash
npm run dev
```

### 5. Execute o frontend em outro terminal

```bash
npm run dev:frontend
```

### 6. Acesse a aplicação

- Frontend: http://localhost:3001
- API Backend: http://localhost:3000

## Funcionalidades

- Análise de sentimento baseada em dados de redes sociais e notícias
- Análise técnica com indicadores populares
- Previsão de preços usando modelos de aprendizado de máquina
- Visualização de dados em tempo real 