import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { broadcastUpdate } from '../../websocket';
import { analyzeTrend } from '../../services/analysis/predictiveAnalysis';
import { CryptoAsset } from '../../models/crypto';

// Criar router
const router: Router = express.Router();

/**
 * @route POST /api/realtime/broadcast
 * @description Envia uma atualização para todos os clientes WebSocket inscritos
 */
router.post('/broadcast', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol, type, data } = req.body;
    
    // Validar parâmetros obrigatórios
    if (!symbol || !type || !data) {
      return res.status(400).json({ 
        error: 'Parâmetros incompletos. Forneça symbol, type e data' 
      });
    }
    
    // Validar tipo
    if (!['price', 'social', 'technical', 'transaction'].includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo inválido. Use price, social, technical ou transaction' 
      });
    }
    
    // Verificar se o ativo existe
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset) {
      return res.status(404).json({ error: `Ativo não encontrado: ${symbol}` });
    }
    
    // Enviar para todos os clientes inscritos
    broadcastUpdate(
      symbol.toUpperCase(), 
      type as 'price' | 'social' | 'technical' | 'transaction',
      data
    );
    
    return res.status(200).json({ 
      message: 'Atualização enviada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao enviar atualização:', error);
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

/**
 * @route POST /api/realtime/update-price
 * @description Atualiza o preço de um ativo e notifica os clientes
 */
router.post('/update-price', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol, price, volume24h, change24h } = req.body;
    
    // Validar parâmetros obrigatórios
    if (!symbol || price === undefined) {
      return res.status(400).json({ 
        error: 'Parâmetros incompletos. Forneça pelo menos symbol e price' 
      });
    }
    
    // Buscar e atualizar ativo
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset) {
      return res.status(404).json({ error: `Ativo não encontrado: ${symbol}` });
    }
    
    // Atualizar preço
    asset.currentPrice = price;
    
    // Atualizar histórico de preço (simulação simplificada)
    if (!asset.priceHistory) {
      asset.priceHistory = [];
    }
    
    // Adicionar novo registro no início
    asset.priceHistory.unshift({
      price,
      volume24h: volume24h || 0,
      change24h: change24h || 0,
      timestamp: new Date(),
      marketCap: asset.priceHistory?.[0]?.marketCap || 0,
      change7d: asset.priceHistory?.[0]?.change7d || 0,
      source: 'realtime-api'
    });
    
    // Limitar histórico a 100 registros
    if (asset.priceHistory.length > 100) {
      asset.priceHistory = asset.priceHistory.slice(0, 100);
    }
    
    // Salvar ativo
    await asset.save();
    
    // Enviar atualização para clientes WebSocket
    broadcastUpdate(
      symbol.toUpperCase(),
      'price',
      {
        price,
        volume24h: volume24h || 0,
        change24h: change24h || 0,
        timestamp: new Date().toISOString()
      }
    );
    
    // Se houver mudança significativa de preço, gerar alerta de tendência
    if (Math.abs(change24h || 0) >= 5) {
      try {
        const trend = await analyzeTrend(symbol);
        
        // Enviar alerta de tendência
        broadcastUpdate(
          symbol.toUpperCase(),
          'technical',
          {
            type: 'trend_alert',
            direction: trend.direction,
            confidence: trend.confidence,
            factors: trend.factors.slice(0, 2),
            timestamp: new Date().toISOString()
          }
        );
      } catch (error) {
        logger.error(`Erro ao gerar alerta de tendência para ${symbol}:`, error);
      }
    }
    
    return res.status(200).json({ 
      message: 'Preço atualizado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao atualizar preço:', error);
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

export default router; 