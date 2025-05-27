import { Router, Request, Response } from 'express';
import { sentimentAnalysisService, SentimentFilter } from '../services/sentimentAnalysisService';
import { logger } from '../utils/logger';

const router = Router();
const sentimentService = sentimentAnalysisService;

// Funções auxiliares para análise de sentimento mock
function analyzeSentimentMock(text: string): { sentiment: 'positive' | 'negative' | 'neutral', score: number, confidence: number } {
  const positiveWords = ['bullish', 'growth', 'surge', 'breakthrough', 'adoption', 'positive', 'good', 'great', 'excellent'];
  const negativeWords = ['bearish', 'decline', 'drop', 'crash', 'concerns', 'negative', 'bad', 'terrible', 'awful'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  let wordCount = 0;
  
  positiveWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    score += matches * 0.2;
    wordCount += matches;
  });
  
  negativeWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    score -= matches * 0.2;
    wordCount += matches;
  });
  
  // Normalizar score entre -1 e 1
  score = Math.max(-1, Math.min(1, score));
  
  let sentiment: 'positive' | 'negative' | 'neutral';
  if (score > 0.1) sentiment = 'positive';
  else if (score < -0.1) sentiment = 'negative';
  else sentiment = 'neutral';
  
  // Confiança baseada no número de palavras-chave encontradas
  const confidence = Math.min(0.9, 0.5 + (wordCount * 0.1));
  
  return { sentiment, score, confidence };
}

function extractKeywords(text: string): string[] {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Retornar as 5 palavras mais relevantes (simplificado)
  return [...new Set(words)].slice(0, 5);
}

/**
 * @swagger
 * components:
 *   schemas:
 *     SentimentData:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do dado de sentimento
 *         text:
 *           type: string
 *           description: Texto analisado
 *         sentiment:
 *           type: string
 *           enum: [positive, negative, neutral]
 *           description: Sentimento detectado
 *         score:
 *           type: number
 *           minimum: -1
 *           maximum: 1
 *           description: Score do sentimento (-1 a 1)
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Confiança da análise (0 a 1)
 *         timestamp:
 *           type: number
 *           description: Timestamp Unix
 *         source:
 *           type: string
 *           description: Fonte da notícia/texto
 *         symbol:
 *           type: string
 *           description: Símbolo da criptomoeda relacionada
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Palavras-chave extraídas
 *         impact:
 *           type: string
 *           enum: [high, medium, low]
 *           description: Impacto estimado no mercado
 *     
 *     SentimentMetrics:
 *       type: object
 *       properties:
 *         overall:
 *           type: object
 *           properties:
 *             sentiment:
 *               type: string
 *               enum: [positive, negative, neutral]
 *             score:
 *               type: number
 *             confidence:
 *               type: number
 *             trend:
 *               type: string
 *               enum: [improving, declining, stable]
 *         bySymbol:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               sentiment:
 *                 type: string
 *               score:
 *                 type: number
 *               count:
 *                 type: integer
 *               change24h:
 *                 type: number
 *         bySource:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               sentiment:
 *                 type: string
 *               score:
 *                 type: number
 *               count:
 *                 type: integer
 *               reliability:
 *                 type: number
 *         trends:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SentimentTrend'
 *         alerts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SentimentAlert'
 *     
 *     SentimentTrend:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: number
 *         positive:
 *           type: number
 *         negative:
 *           type: number
 *         neutral:
 *           type: number
 *         averageScore:
 *           type: number
 *         volume:
 *           type: number
 *     
 *     SentimentAlert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [sudden_change, extreme_sentiment, volume_spike]
 *         severity:
 *           type: string
 *           enum: [high, medium, low]
 *         message:
 *           type: string
 *         timestamp:
 *           type: number
 *         symbol:
 *           type: string
 *         data:
 *           type: object
 */

/**
 * @swagger
 * /api/sentiment/metrics:
 *   get:
 *     summary: Obter métricas gerais de sentimento
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: symbols
 *         schema:
 *           type: string
 *         description: Simbolos separados por virgula (ex BTC ETH)
 *       - in: query
 *         name: sources
 *         schema:
 *           type: string
 *         description: Fontes separadas por vírgula
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *         description: Filtrar por sentimento (positive,negative,neutral)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data de início (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data de fim (ISO 8601)
 *       - in: query
 *         name: minConfidence
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Confiança mínima
 *       - in: query
 *         name: impact
 *         schema:
 *           type: string
 *         description: Filtrar por impacto (high,medium,low)
 *     responses:
 *       200:
 *         description: Métricas de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SentimentMetrics'
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const filter: SentimentFilter = {};

    // Processar filtros da query
    if (req.query.symbols) {
      filter.symbols = (req.query.symbols as string).split(',').map(s => s.trim());
    }

    if (req.query.sources) {
      filter.sources = (req.query.sources as string).split(',').map(s => s.trim());
    }

    if (req.query.sentiment) {
      filter.sentiment = (req.query.sentiment as string).split(',').map(s => s.trim()) as any;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.dateRange = {
        start: new Date(req.query.startDate as string).getTime(),
        end: new Date(req.query.endDate as string).getTime()
      };
    }

    if (req.query.minConfidence) {
      filter.minConfidence = parseFloat(req.query.minConfidence as string);
    }

    if (req.query.impact) {
      filter.impact = (req.query.impact as string).split(',').map(s => s.trim()) as any;
    }

    const metrics = await sentimentService.getSentimentMetrics(filter);

    res.json({
      success: true,
      data: metrics,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar métricas de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/data:
 *   get:
 *     summary: Obter dados de sentimento com paginação
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Número de itens por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Número de itens para pular
 *       - in: query
 *         name: symbols
 *         schema:
 *           type: string
 *         description: Símbolos separados por vírgula
 *       - in: query
 *         name: sources
 *         schema:
 *           type: string
 *         description: Fontes separadas por vírgula
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *         description: Filtrar por sentimento
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data de fim
 *       - in: query
 *         name: minConfidence
 *         schema:
 *           type: number
 *         description: Confiança mínima
 *       - in: query
 *         name: impact
 *         schema:
 *           type: string
 *         description: Filtrar por impacto
 *     responses:
 *       200:
 *         description: Lista de dados de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentData'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/data', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const filter: SentimentFilter = {};

    // Aplicar os mesmos filtros da rota de métricas
    if (req.query.symbols) {
      filter.symbols = (req.query.symbols as string).split(',').map(s => s.trim());
    }

    if (req.query.sources) {
      filter.sources = (req.query.sources as string).split(',').map(s => s.trim());
    }

    if (req.query.sentiment) {
      filter.sentiment = (req.query.sentiment as string).split(',').map(s => s.trim()) as any;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.dateRange = {
        start: new Date(req.query.startDate as string).getTime(),
        end: new Date(req.query.endDate as string).getTime()
      };
    }

    if (req.query.minConfidence) {
      filter.minConfidence = parseFloat(req.query.minConfidence as string);
    }

    if (req.query.impact) {
      filter.impact = (req.query.impact as string).split(',').map(s => s.trim()) as any;
    }

    const result = await sentimentService.getSentimentData(filter, limit, offset);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore
      },
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar dados de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/trends:
 *   get:
 *     summary: Obter tendências de sentimento
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Número de horas para análise de tendência
 *     responses:
 *       200:
 *         description: Tendências de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentTrend'
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168); // Máximo 7 dias

    const trends = await sentimentService.getSentimentTrends(hours);

    res.json({
      success: true,
      data: trends,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar tendências de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/alerts:
 *   get:
 *     summary: Obter alertas de sentimento
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número máximo de alertas
 *     responses:
 *       200:
 *         description: Lista de alertas de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentAlert'
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const alerts = await sentimentService.getSentimentAlerts(limit);

    res.json({
      success: true,
      data: alerts,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar alertas de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/symbols:
 *   get:
 *     summary: Obter símbolos disponíveis
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Lista de símbolos disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const symbols = sentimentService.getAvailableSymbols();

    res.json({
      success: true,
      data: symbols,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar símbolos disponíveis:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/sources:
 *   get:
 *     summary: Obter fontes disponíveis
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Lista de fontes disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = sentimentService.getAvailableSources();

    res.json({
      success: true,
      data: sources,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao buscar fontes disponíveis:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/analyze:
 *   post:
 *     summary: Analisar sentimento de texto
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - source
 *             properties:
 *               text:
 *                 type: string
 *                 description: Texto para análise
 *               source:
 *                 type: string
 *                 description: Fonte do texto
 *               symbol:
 *                 type: string
 *                 description: Símbolo relacionado (opcional)
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Palavras-chave (opcional)
 *               impact:
 *                 type: string
 *                 enum: [high, medium, low]
 *                 description: Impacto estimado (opcional)
 *     responses:
 *       201:
 *         description: Análise de sentimento criada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SentimentData'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text, source, symbol, keywords, impact } = req.body;

    if (!text || !source) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: text, source'
      });
    }

    // Simular análise de sentimento (em produção, usaria um modelo real)
    const mockSentiment = analyzeSentimentMock(text);
    
    const sentimentData = await sentimentService.addSentimentData({
      text,
      sentiment: mockSentiment.sentiment,
      score: mockSentiment.score,
      confidence: mockSentiment.confidence,
      source,
      symbol,
      keywords: keywords || extractKeywords(text),
      impact: impact || 'medium'
    });

    res.status(201).json({
      success: true,
      data: sentimentData,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Erro ao analisar sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 