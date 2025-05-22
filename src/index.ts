import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { setupMetrics } from './metrics';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { milvusService } from './database/milvus';
import { swaggerSpec } from './config/swagger';
import { ollamaService } from './services/ollamaService';

// Carregar variáveis de ambiente
config();

export const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(rateLimiter);

// Configurar métricas
setupMetrics(app);

// Configurar rotas
setupRoutes(app);

// Configurar Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Configurar WebSocket
setupWebSocket(server);

// Middleware de erro
app.use(errorHandler);

// Inicializar Milvus
const initializeMilvus = async () => {
  try {
    await milvusService.connect();
    await milvusService.createCollection();
    logger.info('Milvus inicializado com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar Milvus:', error);
    process.exit(1);
  }
};

// Inicializar Ollama se o serviço de embedding for o Ollama
const initializeOllama = async () => {
  try {
    if (process.env.EMBEDDING_SERVICE === 'ollama') {
      logger.info('Inicializando modelo Ollama...');
      await ollamaService.pullModel();
      logger.info('Modelo Ollama inicializado com sucesso');
    }
  } catch (error) {
    logger.error('Erro ao inicializar modelo Ollama:', error);
    logger.warn('Continuando sem o modelo Ollama. Os embeddings usarão fallback aleatório.');
  }
};

// Iniciar servidor
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, async () => {
    logger.info(`Servidor rodando na porta ${port}`);
    
    // Verificar se devemos pular a conexão com bancos de dados
    if (process.env.SKIP_DATABASE_CONNECTION === 'true') {
      logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando conexões com bancos de dados');
    }
    // Inicializar Milvus apenas em produção
    else if (process.env.NODE_ENV === 'production') {
      try {
        await initializeMilvus();
      } catch (error) {
        logger.error('Erro ao inicializar Milvus, continuando sem o Milvus:', error);
      }
      try {
        await initializeOllama();
      } catch (error) {
        logger.error('Erro ao inicializar Ollama, continuando sem o Ollama:', error);
      }
      
      // Iniciar sincronização com a Binance
      try {
        const { syncBinanceAssets, startAllPriceStreams } = require('./services/exchanges/binanceService');
        logger.info('Iniciando sincronização com a Binance...');
        
        // Sincronizar ativos primeiro
        await syncBinanceAssets();
        
        // Iniciar streams após 5 segundos (para evitar sobrecarga)
        setTimeout(async () => {
          try {
            await startAllPriceStreams();
            logger.info('Streams da Binance iniciados com sucesso');
            
            // Iniciar treinamento de modelos de ML após 30 segundos
            setTimeout(async () => {
              try {
                const { initializeModels } = require('./services/ml/modelBootstrap');
                await initializeModels();
                logger.info('Inicialização de modelos de ML concluída');
              } catch (error) {
                logger.error('Erro ao inicializar modelos de ML:', error);
              }
            }, 30000);
          } catch (error) {
            logger.error('Erro ao iniciar streams da Binance:', error);
          }
        }, 5000);
      } catch (error) {
        logger.error('Erro ao iniciar integração com a Binance:', error);
      }
    } else {
      logger.info('Executando em modo de desenvolvimento, ignorando conexão com Milvus e Ollama');
    }
  });
} 