import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { setupRoutes } from './routes';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { WebSocketService } from './services/websocket';

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

// Configurar rotas da API
console.log('[MAIN] Chamando setupRoutes...');
try {
  setupRoutes(app);
  console.log('[MAIN] setupRoutes executado com sucesso');
} catch (error) {
  console.error('[MAIN] ERRO ao executar setupRoutes:', error);
}

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

// Fallback para rotas não encontradas (deve ser o ÚLTIMO middleware)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Middleware de erro
app.use(errorHandler);

// Inicialização do servidor
const init = async () => {
  try {
    // Iniciar servidor
    server.listen(port, () => {
      logger.info(`Servidor rodando na porta ${port}`);
    });

    // Inicializar WebSocket Service
    const wsService = new WebSocketService(server);
    (global as any).websocketService = wsService;
    logger.info('WebSocket service inicializado com sucesso');

    logger.info('Inicialização do servidor completa. Serviço pronto para uso!');

  } catch (error) {
    logger.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Iniciar aplicação
init();
