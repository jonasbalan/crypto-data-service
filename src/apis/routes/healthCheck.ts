import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { getMilvusClient } from '../../database/init';
import { cacheService } from '../../services/cache/cacheService';
import { uptime } from 'process';

// Criar router
const router: Router = express.Router();

/**
 * @route GET /api/health
 * @description Verifica o status básico do serviço (endpoint principal)
 */
router.get('/', (req: Request, res: Response): Response => {
  return res.status(200).json({ 
    status: 'ok',
    service: 'crypto-data-service',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/health/check
 * @description Verifica o status do serviço
 */
router.get('/check', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Verificar status de componentes
    const components: Record<string, { status: 'up' | 'down', details?: any }> = {
      api: { status: 'up' },
      cache: { status: 'up', details: cacheService.getStats() }
    };
    
    // Verificar conexão com Milvus (apenas se não for ambiente de teste)
    if (process.env.NODE_ENV !== 'test') {
      try {
        const milvus = getMilvusClient();
        const collections = await milvus.showCollections();
        components.milvus = { 
          status: 'up', 
          details: { 
            collections: collections.data.map((c: any) => c.name),
            count: collections.data.length
          } 
        };
      } catch (error) {
        components.milvus = { status: 'down', details: { error: (error as Error).message } };
      }
    }
    
    // Determinar status geral
    const hasDownComponents = Object.values(components).some(c => c.status === 'down');
    const status = hasDownComponents ? 'degraded' : 'healthy';
    
    // Calcular tempo de atividade em formato legível
    const uptimeSeconds = uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    const uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    return res.status(hasDownComponents ? 503 : 200).json({
      status,
      uptime: uptimeFormatted,
      timestamp: new Date().toISOString(),
      components
    });
  } catch (error) {
    logger.error('Erro ao verificar saúde do serviço:', error);
    return res.status(500).json({ 
      status: 'error',
      error: 'Erro ao verificar saúde do serviço',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/ready
 * @description Verifica se o serviço está pronto para receber tráfego
 */
router.get('/ready', (req: Request, res: Response): Response => {
  // Verificar prontidão
  // Este endpoint é usado por balanceadores de carga e orquestradores de containers
  
  // Aqui podemos verificar se todos os componentes essenciais estão prontos
  const isReady = process.uptime() > 5; // Simples: consideramos pronto após 5 segundos de inicialização
  
  if (isReady) {
    return res.status(200).json({ 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    return res.status(503).json({ 
      status: 'not_ready',
      reason: 'Serviço em inicialização',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 