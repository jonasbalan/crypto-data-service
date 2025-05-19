import { initializeDatabases } from '../database/init';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { startApiServer } from '../apis/server';

const execAsync = promisify(exec);

async function startService() {
  try {
    logger.info('Iniciando serviço...');
    
    // Inicializa os bancos de dados
    await initializeDatabases();
    logger.info('Bancos de dados inicializados com sucesso!');

    // Executa o script de inserção de tokens
    logger.info('Iniciando inserção de tokens...');
    try {
      const { stdout, stderr } = await execAsync('npx ts-node src/scripts/fetch-and-insert-tokens.ts');
      if (stdout) logger.info('Saída do script de tokens:', stdout);
      if (stderr) logger.warn('Erros do script de tokens:', stderr);
    } catch (error: any) {
      logger.error('Erro ao executar script de tokens:', error.message);
    }

    // Inicia o servidor Express
    await startApiServer();
    
    logger.info('Serviço iniciado com sucesso!');
  } catch (error: any) {
    logger.error('Erro ao iniciar serviço:', error.message);
    process.exit(1);
  }
}

startService(); 