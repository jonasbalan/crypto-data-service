import { Router } from 'express';
import { validateSymbol, validateTimeframe, validatePagination } from '../middleware/validationMiddleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/crypto/price/{symbol}:
 *   get:
 *     summary: Obtém o preço atual de uma criptomoeda
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *     responses:
 *       200:
 *         description: Preço atual
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
router.get('/price/:symbol', validateSymbol, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Simulação de resposta para demonstração
    const price = {
      symbol,
      price: 10000 + (Math.random() * 5000),
      change24h: (Math.random() * 10) - 5,
      volume24h: Math.floor(Math.random() * 1000000000) + 500000000,
      timestamp: new Date().toISOString()
    };
    
    return res.json(price);
  } catch (error) {
    logger.error(`Erro ao obter preço para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: 'Erro ao obter preço' });
  }
});

/**
 * @swagger
 * /api/crypto/history/{symbol}:
 *   get:
 *     summary: Obtém histórico de preços de uma criptomoeda
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 4h, 1d, 1w]
 *         description: Intervalo de tempo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Número máximo de registros
 *     responses:
 *       200:
 *         description: Histórico de preços
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
router.get('/history/:symbol', validateSymbol, validateTimeframe, async (req, res) => {
  try {
    const { symbol } = req.params;
    const timeframe = req.query.timeframe as string || '1d';
    const limit = parseInt(req.query.limit as string || '30', 10);
    
    // Simulação de resposta para demonstração
    const basePrice = 10000 + (Math.random() * 5000);
    const history = [];
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() * 200) - 100;
      const price = basePrice + change;
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - i);
      
      history.push({
        symbol,
        price,
        volume24h: Math.floor(Math.random() * 1000000000) + 500000000,
        change24h: (Math.random() * 10) - 5,
        timestamp: timestamp.toISOString(),
        timeframe
      });
    }
    
    return res.json(history);
  } catch (error) {
    logger.error(`Erro ao obter histórico para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: 'Erro ao obter histórico' });
  }
});

/**
 * @swagger
 * /api/crypto/market:
 *   get:
 *     summary: Obtém visão geral do mercado
 *     tags: [Crypto]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Visão geral do mercado
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
router.get('/market', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    
    // Lista de símbolos comuns para simulação
    const symbols = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'SHIB', 'AVAX'];
    
    // Simulação de resposta para demonstração
    const market = symbols.map(symbol => ({
      symbol,
      price: 10000 + (Math.random() * 5000),
      change24h: (Math.random() * 10) - 5,
      volume24h: Math.floor(Math.random() * 1000000000) + 500000000,
      marketCap: Math.floor(Math.random() * 1000000000000) + 50000000000,
      timestamp: new Date().toISOString()
    }));
    
    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMarket = market.slice(startIndex, endIndex);
    
    return res.json({
      data: paginatedMarket,
      pagination: {
        page,
        limit,
        total: market.length,
        pages: Math.ceil(market.length / limit)
      }
    });
  } catch (error) {
    logger.error('Erro ao obter visão geral do mercado:', error);
    return res.status(500).json({ error: 'Erro ao obter visão geral do mercado' });
  }
});

export default router; 