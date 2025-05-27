import { Router, Request, Response } from 'express';
import { metricsService } from '../services/metricsService';

const router = Router();

/**
 * @swagger
 * /api/metrics/system:
 *   get:
 *     summary: Obter métricas completas do sistema
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas do sistema retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SystemMetrics'
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/system', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    console.log('📊 Coletando métricas do sistema...');
    const metrics = await metricsService.getSystemMetrics();
    
    const responseTime = Date.now() - startTime;
    
    // Registrar esta própria requisição
    metricsService.recordApiRequest('GET', '/api/metrics/system', responseTime, true);
    
    console.log(`✅ Métricas coletadas em ${responseTime}ms`);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao obter métricas do sistema:', error);
    
    metricsService.recordApiRequest('GET', '/api/metrics/system', 0, false);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter métricas do sistema',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/metrics/health:
 *   get:
 *     summary: Health check simplificado
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Sistema operacional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 uptime:
 *                   type: number
 *                 timestamp:
 *                   type: number
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Usar métricas cached se disponível
    let metrics = metricsService.getLastMetrics();
    
    if (!metrics || Date.now() - metrics.timestamp > 30000) {
      // Refresh se mais que 30s de cache
      metrics = await metricsService.getSystemMetrics();
    }
    
    const responseTime = Date.now() - startTime;
    metricsService.recordApiRequest('GET', '/api/metrics/health', responseTime, true);
    
    // Determinar status geral
    const criticalServicesDown = metrics.services.filter(s => 
      s.status === 'offline' && ['API REST', 'Database'].includes(s.name)
    ).length;
    
    const status = criticalServicesDown > 0 ? 'unhealthy' : 'healthy';
    
    res.json({
      status,
      uptime: metrics.system.uptime,
      timestamp: Date.now(),
      services: metrics.services.map(s => ({
        name: s.name,
        status: s.status,
        responseTime: s.responseTime
      }))
    });
  } catch (error) {
    console.error('❌ Erro no health check:', error);
    
    metricsService.recordApiRequest('GET', '/api/metrics/health', 0, false);
    
    res.status(500).json({
      status: 'error',
      error: 'Erro no health check',
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /api/metrics/ml:
 *   get:
 *     summary: Métricas específicas de Machine Learning
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas de ML retornadas com sucesso
 */
router.get('/ml', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    const metrics = await metricsService.getSystemMetrics();
    const responseTime = Date.now() - startTime;
    
    metricsService.recordApiRequest('GET', '/api/metrics/ml', responseTime, true);
    
    res.json({
      success: true,
      data: metrics.ml,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao obter métricas de ML:', error);
    
    metricsService.recordApiRequest('GET', '/api/metrics/ml', 0, false);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter métricas de ML',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/metrics/api:
 *   get:
 *     summary: Métricas específicas da API
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas da API retornadas com sucesso
 */
router.get('/api', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    const metrics = await metricsService.getSystemMetrics();
    const responseTime = Date.now() - startTime;
    
    metricsService.recordApiRequest('GET', '/api/metrics/api', responseTime, true);
    
    res.json({
      success: true,
      data: metrics.api,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao obter métricas da API:', error);
    
    metricsService.recordApiRequest('GET', '/api/metrics/api', 0, false);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter métricas da API',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/metrics/database:
 *   get:
 *     summary: Métricas específicas do banco de dados
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Métricas do banco retornadas com sucesso
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    const metrics = await metricsService.getSystemMetrics();
    const responseTime = Date.now() - startTime;
    
    metricsService.recordApiRequest('GET', '/api/metrics/database', responseTime, true);
    
    res.json({
      success: true,
      data: metrics.database,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao obter métricas do banco:', error);
    
    metricsService.recordApiRequest('GET', '/api/metrics/database', 0, false);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter métricas do banco',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/metrics/reset:
 *   post:
 *     summary: Reset das estatísticas (apenas desenvolvimento)
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Estatísticas resetadas com sucesso
 *       403:
 *         description: Operação não permitida em produção
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // Só permitir em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Reset não permitido em produção'
      });
    }
    
    console.log('🔄 Resetando estatísticas de métricas...');
    metricsService.resetStats();
    
    res.json({
      success: true,
      message: 'Estatísticas resetadas com sucesso',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao resetar estatísticas:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao resetar estatísticas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/metrics/model/{modelName}/accuracy:
 *   put:
 *     summary: Atualizar acurácia de um modelo
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do modelo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accuracy:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Acurácia atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.put('/model/:modelName/accuracy', async (req: Request, res: Response) => {
  try {
    const { modelName } = req.params;
    const { accuracy } = req.body;
    
    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 1) {
      return res.status(400).json({
        success: false,
        error: 'Acurácia deve ser um número entre 0 e 1'
      });
    }
    
    console.log(`📊 Atualizando acurácia do modelo ${modelName}: ${accuracy}`);
    metricsService.updateModelAccuracy(modelName, accuracy);
    
    res.json({
      success: true,
      message: `Acurácia do modelo ${modelName} atualizada para ${accuracy}`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar acurácia do modelo:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar acurácia do modelo',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 