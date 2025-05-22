import swaggerJSDoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crypto Data Service API',
      version,
      description: 'API para processamento e análise de dados do mercado crypto utilizando vetorização',
      contact: {
        name: 'Suporte',
        email: 'suporte@cryptodata.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.cryptodata.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      schemas: {
        MarketData: {
          type: 'object',
          required: ['symbol', 'timestamp', 'price', 'volume'],
          properties: {
            symbol: {
              type: 'string',
              description: 'Símbolo da moeda crypto (ex: BTC, ETH)'
            },
            timestamp: {
              type: 'integer',
              description: 'Timestamp em milissegundos'
            },
            price: {
              type: 'number',
              description: 'Preço em USD'
            },
            volume: {
              type: 'number',
              description: 'Volume de negociação em USD'
            }
          }
        },
        Vector: {
          type: 'array',
          items: {
            type: 'number'
          },
          description: 'Vetor de embedding'
        },
        VectorStats: {
          type: 'object',
          properties: {
            row_count: {
              type: 'integer',
              description: 'Número total de vetores'
            },
            partitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string'
                  },
                  row_count: {
                    type: 'integer'
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options); 