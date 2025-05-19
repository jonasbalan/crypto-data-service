# Crypto Data Service

Serviço para coleta, processamento e análise de dados de criptomoedas.

## Funcionalidades

- Coleta de dados em tempo real de exchanges
- Processamento e armazenamento de dados em banco vetorial
- Análise de similaridade entre ativos
- Interface de debug para visualização de dados
- WebSocket para streaming de dados

## Requisitos

- Node.js 18+
- Docker e Docker Compose
- MongoDB
- Redis
- Milvus (banco de dados vetorial)

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd crypto-data-service
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp example.env .env
# Edite o arquivo .env com suas configurações
```

4. Inicie os serviços:
```bash
# Windows
.\dev.ps1

# Linux/Mac
./dev.sh
```

## Uso

### API Endpoints

- `GET /api/vector/debug/html` - Interface de debug com visualização de dados
- `POST /api/vector/query` - Consulta semântica no banco vetorial
- `POST /api/vector/store` - Armazena dados no banco vetorial
- `GET /api/vector/similar/:symbol` - Encontra ativos similares

### WebSocket

O serviço mantém conexões WebSocket com exchanges para coleta de dados em tempo real.

## Desenvolvimento

Para iniciar o servidor em modo de desenvolvimento:

```bash
npm run dev
```

Para build do projeto:

```bash
npm run build
```

## Licença

ISC 