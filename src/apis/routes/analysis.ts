import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { 
  analyzeTrend, 
  findAssetCorrelations, 
  generateMarketInsights,
  TrendAnalysis,
  AssetCorrelation,
  MarketInsight
} from '../../services/analysis/predictiveAnalysis';

// Criar router
const router: Router = express.Router();

/**
 * @route GET /api/analysis/trend/:symbol
 * @description Analisa a tendência de um ativo de criptomoeda
 */
router.get('/trend/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe as '24h' | '7d' | '30d') || '24h';
    
    // Validar timeframe
    if (!['24h', '7d', '30d'].includes(timeframe)) {
      return res.status(400).json({ 
        error: 'Timeframe inválido. Use 24h, 7d ou 30d.' 
      });
    }
    
    // Analisar tendência
    const analysis = await analyzeTrend(symbol, timeframe);
    
    return res.status(200).json(analysis);
  } catch (error: any) {
    logger.error(`Erro ao analisar tendência: ${error.message}`);
    
    // Se o erro for de ativo não encontrado, retornar 404
    if (error.message && error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Erro ao analisar tendência' });
  }
});

/**
 * @route GET /api/analysis/correlations/:symbol
 * @description Encontra ativos correlacionados com o símbolo fornecido
 */
router.get('/correlations/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const timeframe = (req.query.timeframe as '30d' | '90d' | '1y') || '30d';
    const limit = parseInt(req.query.limit as string) || 5;
    
    // Validar timeframe
    if (!['30d', '90d', '1y'].includes(timeframe)) {
      return res.status(400).json({ 
        error: 'Timeframe inválido. Use 30d, 90d ou 1y.' 
      });
    }
    
    // Validar limit
    if (isNaN(limit) || limit < 1 || limit > 20) {
      return res.status(400).json({ 
        error: 'Limite inválido. Use um número entre 1 e 20.' 
      });
    }
    
    // Buscar correlações
    const correlations = await findAssetCorrelations(symbol, timeframe, limit);
    
    return res.status(200).json(correlations);
  } catch (error: any) {
    logger.error(`Erro ao buscar correlações: ${error.message}`);
    
    // Se o erro for de ativo não encontrado, retornar 404
    if (error.message && error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Erro ao buscar correlações' });
  }
});

/**
 * @route GET /api/analysis/insights
 * @description Gera insights de mercado para criptomoedas
 */
router.get('/insights', async (req: Request, res: Response): Promise<Response> => {
  try {
    const count = parseInt(req.query.count as string) || 3;
    
    // Validar count
    if (isNaN(count) || count < 1 || count > 10) {
      return res.status(400).json({ 
        error: 'Contagem inválida. Use um número entre 1 e 10.' 
      });
    }
    
    // Gerar insights
    const insights = await generateMarketInsights(count);
    
    return res.status(200).json({
      insights,
      count: insights.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Erro ao gerar insights: ${error.message}`);
    return res.status(500).json({ error: 'Erro ao gerar insights de mercado' });
  }
});

/**
 * @route GET /api/analysis/summary/:symbol
 * @description Obtém um resumo completo de análises para um ativo
 */
router.get('/summary/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    
    // Executar várias análises em paralelo
    const [trend, correlations, insights] = await Promise.all([
      analyzeTrend(symbol),
      findAssetCorrelations(symbol),
      generateMarketInsights(2)
    ]);
    
    // Filtrar insights relevantes para este ativo
    const relevantInsights = insights.filter(insight => 
      insight.affectedAssets.includes(symbol.toUpperCase())
    );
    
    return res.status(200).json({
      symbol: symbol.toUpperCase(),
      trend,
      correlations,
      insights: relevantInsights,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Erro ao gerar resumo para ${req.params.symbol}: ${error.message}`);
    
    // Se o erro for de ativo não encontrado, retornar 404
    if (error.message && error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Erro ao gerar resumo de análise' });
  }
});

export default router; 