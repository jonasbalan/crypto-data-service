import { Request, Response } from 'express';
import { analyzeSentiment, getMarketSentimentSummary } from '../services/ml/sentimentAnalysis';
import { logger } from '../utils/logger';

/**
 * @swagger
 * /api/sentiment/{symbol}:
 *   get:
 *     summary: Obtém análise de sentimento para uma criptomoeda
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *     responses:
 *       200:
 *         description: Análise de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentimentResult'
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
export async function getSentimentAnalysis(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo não fornecido' });
    }
    
    const result = await analyzeSentiment(symbol);
    return res.json(result);
  } catch (error) {
    logger.error('Erro ao obter análise de sentimento:', error);
    return res.status(500).json({ error: 'Erro ao processar análise de sentimento' });
  }
}

/**
 * @swagger
 * /api/sentiment/{symbol}/summary:
 *   get:
 *     summary: Obtém resumo de análise de sentimento combinado com indicadores técnicos
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *     responses:
 *       200:
 *         description: Resumo de sentimento e recomendação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 symbol:
 *                   type: string
 *                 sentimentScore:
 *                   type: number
 *                 technicalScore:
 *                   type: number
 *                 overallRecommendation:
 *                   type: string
 *                   enum: [comprar, vender, manter]
 *                 confidence:
 *                   type: number
 *                 reasonSummary:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro no servidor
 */
export async function getSentimentSummary(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo não fornecido' });
    }
    
    const result = await getMarketSentimentSummary(symbol);
    return res.json(result);
  } catch (error) {
    logger.error('Erro ao obter resumo de sentimento:', error);
    return res.status(500).json({ error: 'Erro ao processar resumo de sentimento' });
  }
}

/**
 * @swagger
 * /api/sentiment/trending:
 *   get:
 *     summary: Obtém as criptomoedas em tendência baseado na análise de sentimento
 *     tags: [Sentiment]
 *     responses:
 *       200:
 *         description: Lista de criptomoedas em tendência
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                   sentiment:
 *                     type: string
 *                     enum: [bullish, bearish, neutral]
 *                   score:
 *                     type: number
 *                   volume24h:
 *                     type: number
 *                   change24h:
 *                     type: number
 *       500:
 *         description: Erro no servidor
 */
export async function getTrendingBysentiment(req: Request, res: Response) {
  try {
    // Em um sistema real, buscaríamos dados de várias moedas
    // Para simular, vamos gerar dados para as principais moedas
    
    const symbols = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'SHIB', 'AVAX'];
    const trending = [];
    
    for (const symbol of symbols) {
      // Gerar sentimento aleatório para simulação
      const score = Math.min(Math.max(Math.random() * 2 - 0.8, -1), 1);
      let sentiment: 'bullish' | 'bearish' | 'neutral';
      
      if (score > 0.2) {
        sentiment = 'bullish';
      } else if (score < -0.2) {
        sentiment = 'bearish';
      } else {
        sentiment = 'neutral';
      }
      
      trending.push({
        symbol,
        sentiment,
        score,
        volume24h: Math.floor(Math.random() * 1000000000) + 100000000,
        change24h: Math.min(Math.max(Math.random() * 20 - 10, -15), 15)
      });
    }
    
    // Ordenar por score de sentimento (mais positivo primeiro)
    trending.sort((a, b) => b.score - a.score);
    
    return res.json(trending);
  } catch (error) {
    logger.error('Erro ao obter tendências de sentimento:', error);
    return res.status(500).json({ error: 'Erro ao processar tendências de sentimento' });
  }
} 