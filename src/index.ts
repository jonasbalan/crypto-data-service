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

// Verificar modo sem Docker
const isDockerlessMode = process.env.SKIP_DATABASE_CONNECTION === 'true';
if (isDockerlessMode) {
  console.log('🚀 Iniciando em modo sem Docker - usando apenas APIs externas');
}

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

// Servir arquivos estáticos do frontend ANTES das rotas da API
const frontendPath = path.join(__dirname, '../dist/frontend');
if (process.env.NODE_ENV === 'production' || isDockerlessMode) {
  // Servir os arquivos compilados do frontend
  app.use(express.static(frontendPath));
  console.log(`[FRONTEND] Servindo arquivos estáticos de: ${frontendPath}`);
}

// Configurar rotas da API
console.log('[MAIN] Chamando setupRoutes...');
try {
  setupRoutes(app);
  console.log('[MAIN] setupRoutes executado com sucesso');
} catch (error) {
  console.error('[MAIN] ERRO ao executar setupRoutes:', error);
}

// Para qualquer rota não encontrada na API, servir o index.html (SPA)
if (process.env.NODE_ENV === 'production' || isDockerlessMode) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/health')) {
      const indexPath = path.join(frontendPath, 'index.html');
      res.sendFile(indexPath);
    } else {
      // Se for uma rota de API não encontrada
      res.status(404).json({ error: 'Endpoint não encontrado' });
    }
  });
}

// Middleware de erro
app.use(errorHandler);

// Inicialização do servidor
const init = async () => {
  try {
    // Iniciar servidor
    server.listen(port, () => {
      logger.info(`Servidor rodando na porta ${port}`);
      console.log('');
      console.log('🌐 Crypto Data Service iniciado com sucesso!');
      console.log('================================================');
      console.log(`📍 Frontend: http://localhost:${port}`);
      console.log(`📍 API: http://localhost:${port}/api`);
      console.log(`📍 Health: http://localhost:${port}/health`);
      console.log(`📍 Swagger: http://localhost:${port}/api-docs`);
      console.log('');
      if (isDockerlessMode) {
        console.log('🔧 Modo: Sem Docker (apenas APIs externas)');
        console.log('📊 Dados: CoinGecko API + RSS Feeds');
      }
      console.log('💡 Pressione Ctrl+C para parar o servidor');
      console.log('');
    });

    // Inicializar WebSocket Service (sempre, inclusive sem Docker)
    try {
      const wsService = new WebSocketService(server);
      (global as any).websocketService = wsService;
      logger.info('WebSocket service inicializado com sucesso');
    } catch (wsError) {
      logger.warn('WebSocket service não pôde ser inicializado:', wsError);
    }

    logger.info('Inicialização do servidor completa. Serviço pronto para uso!');

  } catch (error) {
    logger.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Iniciar aplicação
init();
