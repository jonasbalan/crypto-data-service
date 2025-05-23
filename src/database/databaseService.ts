import { logger } from '../utils/logger';
import { initializeDatabase } from './init';

/**
 * Serviço para gerenciar conexões com bancos de dados
 */
class DatabaseService {
  private initialized: boolean = false;

  /**
   * Inicializa todas as conexões com bancos de dados
   */
  async initializeDatabase(): Promise<void> {
    if (this.initialized) {
      logger.info('Bancos de dados já inicializados');
      return;
    }

    try {
      // Se devemos pular as conexões com bancos de dados
      if (process.env.SKIP_DATABASE_CONNECTION === 'true') {
        logger.info('SKIP_DATABASE_CONNECTION está ativado, ignorando conexões com bancos de dados');
        this.initialized = true;
        return;
      }

      // Inicializar bancos de dados
      await initializeDatabase();
      
      this.initialized = true;
      logger.info('Bancos de dados inicializados com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar bancos de dados:', error);
      // Não lançamos erro para evitar que a aplicação falhe completamente
      logger.info('Continuando com funcionalidades limitadas sem bancos de dados');
    }
  }
}

export const databaseService = new DatabaseService(); 