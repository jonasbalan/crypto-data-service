import { Router, Request, Response } from 'express';
import { getSentimentAnalysis, getSentimentSummary, getTrendingBysentiment } from '../controllers/sentimentController';
import { validateSymbol } from '../middleware/validationMiddleware';
import { sentimentAnalysisService, SentimentFilter } from '../services/sentimentAnalysisService';
import { SentimentService } from '../services/sentimentService';

const router = Router();
const sentimentService = new SentimentService();

/**
 * @swagger
 * components:
 *   schemas:
 *     SentimentData:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do item de sentimento
 *         text:
 *           type: string
 *           description: Texto analisado
 *         sentiment:
 *           type: string
 *           enum: [positive, negative, neutral]
 *           description: Classificação do sentimento
 *         score:
 *           type: number
 *           minimum: -1
 *           maximum: 1
 *           description: Score numérico do sentimento
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Confiança da análise
 *         timestamp:
 *           type: number
 *           description: Timestamp Unix
 *         source:
 *           type: string
 *           description: Fonte da notícia
 *         symbol:
 *           type: string
 *           description: Símbolo da criptomoeda
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Palavras-chave extraídas
 *         impact:
 *           type: string
 *           enum: [high, medium, low]
 *           description: Impacto estimado
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
 *                 type: number
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
 *                 type: number
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
 * Rotas para análise de sentimento
 */

// Obter criptomoedas em tendência com base na análise de sentimento
router.get('/trending', getTrendingBysentiment);

// Obter resumo com recomendação para uma criptomoeda (deve vir antes da rota genérica)
router.get('/:symbol/summary', validateSymbol, getSentimentSummary);

// Obter análise de sentimento para uma criptomoeda
router.get('/:symbol', validateSymbol, getSentimentAnalysis);

/**
 * @swagger
 * /api/sentiment/metrics:
 *   get:
 *     summary: Obter métricas de análise de sentimento
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
 *         description: Tipos de sentimento separados por vírgula
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
 *         description: Níveis de impacto separados por vírgula
 *     responses:
 *       200:
 *         description: Métricas de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentimentMetrics'
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const filter: SentimentFilter = {};

    // Parse query parameters
    if (req.query.symbols) {
      filter.symbols = (req.query.symbols as string).split(',').map(s => s.trim());
    }

    if (req.query.sources) {
      filter.sources = (req.query.sources as string).split(',').map(s => s.trim());
    }

    if (req.query.sentiment) {
      filter.sentiment = (req.query.sentiment as string).split(',').map(s => s.trim()) as ('positive' | 'negative' | 'neutral')[];
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
      filter.impact = (req.query.impact as string).split(',').map(s => s.trim()) as ('high' | 'medium' | 'low')[];
    }

    const metrics = await sentimentAnalysisService.getSentimentMetrics(filter);
    res.json(metrics);
  } catch (error) {
    console.error('Erro ao obter métricas de sentimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
 *         description: Tipos de sentimento separados por vírgula
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
 *         description: Níveis de impacto separados por vírgula
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Número máximo de itens por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de itens para pular
 *     responses:
 *       200:
 *         description: Lista de dados de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SentimentData'
 *                 total:
 *                   type: number
 *                 hasMore:
 *                   type: boolean
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     page:
 *                       type: number
 *                     totalPages:
 *                       type: number
 */
router.get('/data', async (req: Request, res: Response) => {
  try {
    const filter: SentimentFilter = {};
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    // Parse filters (mesmo código do endpoint anterior)
    if (req.query.symbols) {
      filter.symbols = (req.query.symbols as string).split(',').map(s => s.trim());
    }

    if (req.query.sources) {
      filter.sources = (req.query.sources as string).split(',').map(s => s.trim());
    }

    if (req.query.sentiment) {
      filter.sentiment = (req.query.sentiment as string).split(',').map(s => s.trim()) as ('positive' | 'negative' | 'neutral')[];
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
      filter.impact = (req.query.impact as string).split(',').map(s => s.trim()) as ('high' | 'medium' | 'low')[];
    }

    const result = await sentimentAnalysisService.getSentimentData(filter, limit, offset);
    
    const response = {
      ...result,
      pagination: {
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(result.total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao obter dados de sentimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sentiment/trends:
 *   get:
 *     summary: Obter tendências de sentimento ao longo do tempo
 *     tags: [Sentiment Analysis]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *           maximum: 168
 *         description: Número de horas de histórico (máximo 7 dias)
 *     responses:
 *       200:
 *         description: Tendências de sentimento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SentimentTrend'
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168); // Máximo 7 dias
    const trends = await sentimentAnalysisService.getSentimentTrends(hours);
    res.json(trends);
  } catch (error) {
    console.error('Erro ao obter tendências de sentimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
 *           default: 20
 *           maximum: 100
 *         description: Número máximo de alertas
 *     responses:
 *       200:
 *         description: Lista de alertas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SentimentAlert'
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const alerts = await sentimentAnalysisService.getSentimentAlerts(limit);
    res.json(alerts);
  } catch (error) {
    console.error('Erro ao obter alertas de sentimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sentiment/symbols:
 *   get:
 *     summary: Obter lista de símbolos disponíveis
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Lista de símbolos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const symbols = sentimentAnalysisService.getAvailableSymbols();
    res.json(symbols);
  } catch (error) {
    console.error('Erro ao obter símbolos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sentiment/sources:
 *   get:
 *     summary: Obter lista de fontes disponíveis
 *     tags: [Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Lista de fontes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = sentimentAnalysisService.getAvailableSources();
    res.json(sources);
  } catch (error) {
    console.error('Erro ao obter fontes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sentiment/analyze:
 *   post:
 *     summary: Adicionar nova análise de sentimento
 *     tags: [Sentiment Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - sentiment
 *               - score
 *               - confidence
 *               - source
 *             properties:
 *               text:
 *                 type: string
 *                 description: Texto para análise
 *               sentiment:
 *                 type: string
 *                 enum: [positive, negative, neutral]
 *                 description: Classificação do sentimento
 *               score:
 *                 type: number
 *                 minimum: -1
 *                 maximum: 1
 *                 description: Score numérico
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Confiança da análise
 *               source:
 *                 type: string
 *                 description: Fonte da informação
 *               symbol:
 *                 type: string
 *                 description: Símbolo da criptomoeda (opcional)
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
 *         description: Análise criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SentimentData'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text, sentiment, score, confidence, source, symbol, keywords, impact } = req.body;

    // Validação básica
    if (!text || !sentiment || score === undefined || confidence === undefined || !source) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: text, sentiment, score, confidence, source' 
      });
    }

    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      return res.status(400).json({ 
        error: 'Sentiment deve ser: positive, negative ou neutral' 
      });
    }

    if (score < -1 || score > 1) {
      return res.status(400).json({ 
        error: 'Score deve estar entre -1 e 1' 
      });
    }

    if (confidence < 0 || confidence > 1) {
      return res.status(400).json({ 
        error: 'Confidence deve estar entre 0 e 1' 
      });
    }

    const newData = await sentimentAnalysisService.addSentimentData({
      text,
      sentiment,
      score,
      confidence,
      source,
      symbol,
      keywords: keywords || [],
      impact: impact || 'medium'
    });

    res.status(201).json(newData);
  } catch (error) {
    console.error('Erro ao adicionar análise de sentimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sentiment/analysis/{symbol}:
 *   get:
 *     summary: Obter análises de sentimento para um símbolo
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Simbolo da criptomoeda (ex BTC ETH)
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Período de tempo para análise
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de resultados
 *     responses:
 *       200:
 *         description: Análises de sentimento obtidas com sucesso
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
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: number
 *                       symbol:
 *                         type: string
 *                       sentiment:
 *                         type: string
 *                         enum: [positive, negative, neutral]
 *                       score:
 *                         type: number
 *                       confidence:
 *                         type: number
 *                       source:
 *                         type: string
 *                       text:
 *                         type: string
 *                       price:
 *                         type: number
 */
router.get('/analysis/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeRange = '24h', limit = 100 } = req.query;

    const data = await sentimentService.getSentimentAnalysis(
      symbol.toUpperCase(),
      timeRange as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data,
      metadata: {
        symbol: symbol.toUpperCase(),
        timeRange,
        count: data.length,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar análise de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/summary/{symbol}:
 *   get:
 *     summary: Obter resumo de sentimento para um símbolo
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
 *         description: Resumo de sentimento obtido com sucesso
 */
router.get('/summary/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const summary = await sentimentService.getSentimentSummary(symbol.toUpperCase());

    res.json({
      success: true,
      data: summary,
      metadata: {
        symbol: symbol.toUpperCase(),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de sentimento:', error);
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
 *     tags: [Sentiment]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número máximo de alertas
 *     responses:
 *       200:
 *         description: Alertas de sentimento obtidos com sucesso
 */
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const alerts = await sentimentService.getSentimentAlerts(parseInt(limit as string));

    res.json({
      success: true,
      data: alerts,
      metadata: {
        count: alerts.length,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar alertas de sentimento:', error);
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
 *     tags: [Sentiment]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Período de tempo para análise
 *     responses:
 *       200:
 *         description: Tendências de sentimento obtidas com sucesso
 */
router.get('/trends', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    const trends = await sentimentService.getSentimentTrends(timeRange as string);

    res.json({
      success: true,
      data: trends,
      metadata: {
        timeRange,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar tendências de sentimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/sentiment/correlation/{symbol}:
 *   get:
 *     summary: Obter correlação preço-sentimento
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Período de tempo para análise
 *     responses:
 *       200:
 *         description: Correlação obtida com sucesso
 */
router.get('/correlation/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeRange = '24h' } = req.query;

    const correlation = await sentimentService.getPriceSentimentCorrelation(
      symbol.toUpperCase(),
      timeRange as string
    );

    res.json({
      success: true,
      data: correlation,
      metadata: {
        symbol: symbol.toUpperCase(),
        timeRange,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar correlação:', error);
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
 *     summary: Obter estatísticas por fonte de dados
 *     tags: [Sentiment]
 *     responses:
 *       200:
 *         description: Estatísticas por fonte obtidas com sucesso
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await sentimentService.getSourceStatistics();

    res.json({
      success: true,
      data: sources,
      metadata: {
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas por fonte:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 