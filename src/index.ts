import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { setupMetrics } from './metrics';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { milvusService } from './database/milvus';
import { swaggerSpec } from './config/swagger';
import { ollamaService } from './services/ollamaService';
import { databaseService } from './database/databaseService';

// Carregar variáveis de ambiente
config();

export const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(rateLimiter);

// Configurar métricas
setupMetrics(app);

// Configurar rotas da API
setupRoutes(app);

// Configurar Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Servir arquivos estáticos do frontend
if (process.env.NODE_ENV === 'production') {
  // Em produção, servir os arquivos compilados do frontend
  app.use(express.static(path.join(__dirname, 'frontend')));
  
  // Para qualquer rota não encontrada na API, servir o index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    }
  });
}

// Configurar WebSocket
setupWebSocket(server);

// Middleware de erro
app.use(errorHandler);

// Inicialização do servidor
const init = async () => {
  try {
    // Iniciar servidor
    server.listen(port, () => {
      logger.info(`Servidor rodando na porta ${port}`);
    });

    // Inicializar serviços após o servidor estar rodando
    // Separar cada inicialização em seu próprio try/catch
    try {
      // Inicializar Milvus
      if (process.env.SKIP_DATABASE_CONNECTION === 'true') {
        logger.info('SKIP_DATABASE_CONNECTION está ativado, simulando inicialização do Milvus');
      } else {
        try {
          await milvusService.connect();
          await milvusService.createCollection();
        } catch (error) {
          logger.error('Erro ao inicializar Milvus, continuando sem o Milvus:', error);
        }
      }
    } catch (error) {
      logger.error('Erro geral ao inicializar Milvus:', error);
    }

    try {
      // Inicializar Ollama
      await initializeOllama();
    } catch (error) {
      logger.error('Erro ao inicializar Ollama:', error);
    }

    try {
      // Inicializar bancos de dados
      await databaseService.initializeDatabase();
    } catch (error) {
      logger.error('Erro ao inicializar bancos de dados:', error);
    }

    logger.info('Inicialização do servidor completa. Serviço pronto para uso!');

  } catch (error) {
    logger.error('Erro ao inicializar servidor:', error);
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

// Iniciar aplicação
init();
