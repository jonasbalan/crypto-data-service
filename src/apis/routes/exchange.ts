import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { 
  getAllPrices, 
  get24hTicker, 
  getKlines, 
  startPriceStream, 
  stopPriceStream,
  syncBinanceAssets,
  startAllPriceStreams,
  stopAllPriceStreams
} from '../../services/exchanges/binanceService';

// Criar router
const router: Router = express.Router();

/**
 * @route GET /api/exchange/prices
 * @description Obtém preços atuais de todos os pares
 */
router.get('/prices', async (req: Request, res: Response): Promise<Response> => {
  try {
    const prices = await getAllPrices();
    
    // Filtrar por símbolo se fornecido
    const { symbol } = req.query;
    if (symbol) {
      const filteredPrices = prices.filter(p => 
        p.symbol.includes(symbol.toString().toUpperCase())
      );
      return res.status(200).json(filteredPrices);
    }
    
    return res.status(200).json(prices);
  } catch (error: any) {
    logger.error('Erro ao buscar preços:', error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar preços' });
  }
});

/**
 * @route GET /api/exchange/ticker/:symbol
 * @description Obtém dados de ticker de 24h para um símbolo
 */
router.get('/ticker/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const ticker = await get24hTicker(symbol);
    return res.status(200).json(ticker);
  } catch (error: any) {
    logger.error(`Erro ao buscar ticker para ${req.params.symbol}:`, error);
    
    // Se for erro 400 da API, provavelmente o símbolo não existe
    if (error.response?.status === 400) {
      return res.status(404).json({ error: `Símbolo não encontrado: ${req.params.symbol}` });
    }
    
    return res.status(500).json({ error: error.message || 'Erro ao buscar ticker' });
  }
});

/**
 * @route GET /api/exchange/klines/:symbol
 * @description Obtém klines/candles para um símbolo
 */
router.get('/klines/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1h';
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Validar intervalo
    if (!['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].includes(interval)) {
      return res.status(400).json({ 
        error: 'Intervalo inválido. Use 1m, 5m, 15m, 30m, 1h, 4h, 1d ou 1w.' 
      });
    }
    
    // Validar limite
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({ 
        error: 'Limite inválido. Use um número entre 1 e 1000.' 
      });
    }
    
    const klines = await getKlines(
      symbol, 
      interval as '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w',
      limit
    );
    return res.status(200).json(klines);
  } catch (error: any) {
    logger.error(`Erro ao buscar klines para ${req.params.symbol}:`, error);
    
    // Se for erro 400 da API, provavelmente o símbolo não existe
    if (error.response?.status === 400) {
      return res.status(404).json({ error: `Símbolo não encontrado: ${req.params.symbol}` });
    }
    
    return res.status(500).json({ error: error.message || 'Erro ao buscar klines' });
  }
});

/**
 * @route POST /api/exchange/stream/start/:symbol
 * @description Inicia um stream WebSocket para um símbolo
 */
router.post('/stream/start/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    startPriceStream(symbol);
    return res.status(200).json({ 
      message: `Stream iniciado para ${symbol}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Erro ao iniciar stream para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao iniciar stream' });
  }
});

/**
 * @route POST /api/exchange/stream/stop/:symbol
 * @description Para um stream WebSocket para um símbolo
 */
router.post('/stream/stop/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    stopPriceStream(symbol);
    return res.status(200).json({ 
      message: `Stream parado para ${symbol}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Erro ao parar stream para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao parar stream' });
  }
});

/**
 * @route POST /api/exchange/stream/start-all
 * @description Inicia streams para todos os ativos
 */
router.post('/stream/start-all', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Iniciar processo em background
    startAllPriceStreams()
      .then(() => logger.info('Todos os streams iniciados com sucesso'))
      .catch(error => logger.error('Erro ao iniciar streams:', error));
    
    return res.status(202).json({ 
      message: 'Inicialização de streams em andamento',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Erro ao iniciar todos os streams:', error);
    return res.status(500).json({ error: error.message || 'Erro ao iniciar streams' });
  }
});

/**
 * @route POST /api/exchange/stream/stop-all
 * @description Para todos os streams WebSocket
 */
router.post('/stream/stop-all', async (req: Request, res: Response): Promise<Response> => {
  try {
    stopAllPriceStreams();
    return res.status(200).json({ 
      message: 'Todos os streams foram encerrados',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Erro ao parar todos os streams:', error);
    return res.status(500).json({ error: error.message || 'Erro ao parar streams' });
  }
});

/**
 * @route POST /api/exchange/sync
 * @description Sincroniza dados de todos os ativos da Binance
 */
router.post('/sync', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Iniciar processo em background
    syncBinanceAssets()
      .then(() => logger.info('Sincronização da Binance concluída'))
      .catch(error => logger.error('Erro na sincronização da Binance:', error));
    
    return res.status(202).json({ 
      message: 'Sincronização iniciada em background',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Erro ao iniciar sincronização:', error);
    return res.status(500).json({ error: error.message || 'Erro ao iniciar sincronização' });
  }
});

export default router; 