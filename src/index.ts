import dotenv from 'dotenv';
import { startApiServer } from './apis/server';
import { initializeWebsockets } from './websockets/manager';
import { initializeDatabases } from './database/init';
import { logger } from './utils/logger';

// Carregar variáveis de ambiente
dotenv.config();

async function bootstrap() {
  try {
    // Inicializar conexões com bancos de dados
    await initializeDatabases();
    
    // Iniciar servidores de websocket para dados em tempo real
    await initializeWebsockets();
    
    // Iniciar servidor API REST
    await startApiServer();
    
    logger.info('Serviço de dados de criptomoedas iniciado com sucesso');
  } catch (error) {
    logger.error('Erro ao iniciar o serviço:', error);
    process.exit(1);
  }
}

bootstrap(); 