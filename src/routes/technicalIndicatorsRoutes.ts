import { Router, Request, Response } from 'express';
import { technicalIndicatorsService } from '../services/technicalIndicatorsService';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TechnicalSignal:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: number
 *           description: Timestamp do sinal
 *         type:
 *           type: string
 *           enum: [buy, sell, neutral]
 *           description: Tipo do sinal
 *         strength:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Força do sinal
 *         description:
 *           type: string
 *           description: Descrição do sinal
 *         price:
 *           type: number
 *           description: Preço no momento do sinal
 *     
 *     IchimokuCloud:
 *       type: object
 *       properties:
 *         tenkanSen:
 *           type: array
 *           items:
 *             type: number
 *           description: Linha de conversão (9 períodos)
 *         kijunSen:
 *           type: array
 *           items:
 *             type: number
 *           description: Linha de base (26 períodos)
 *         senkouSpanA:
 *           type: array
 *           items:
 *             type: number
 *           description: Span A da nuvem
 *         senkouSpanB:
 *           type: array
 *           items:
 *             type: number
 *           description: Span B da nuvem
 *         chikouSpan:
 *           type: array
 *           items:
 *             type: number
 *           description: Linha de atraso
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     FibonacciRetracement:
 *       type: object
 *       properties:
 *         levels:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               level:
 *                 type: number
 *               price:
 *                 type: number
 *               label:
 *                 type: string
 *         trend:
 *           type: string
 *           enum: [uptrend, downtrend]
 *         highPrice:
 *           type: number
 *         lowPrice:
 *           type: number
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     TechnicalIndicatorResult:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         values:
 *           type: array
 *           items:
 *             type: number
 *         timestamps:
 *           type: array
 *           items:
 *             type: number
 *         parameters:
 *           type: object
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     AdvancedIndicators:
 *       type: object
 *       properties:
 *         ichimoku:
 *           $ref: '#/components/schemas/IchimokuCloud'
 *         fibonacci:
 *           $ref: '#/components/schemas/FibonacciRetracement'
 *         stochastic:
 *           $ref: '#/components/schemas/TechnicalIndicatorResult'
 *         williamsr:
 *           $ref: '#/components/schemas/TechnicalIndicatorResult'
 *         cci:
 *           $ref: '#/components/schemas/TechnicalIndicatorResult'
 *         adx:
 *           $ref: '#/components/schemas/TechnicalIndicatorResult'
 *         parabolicSar:
 *           $ref: '#/components/schemas/TechnicalIndicatorResult'
 *     
 *     IndicatorsSummary:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *         overallSignal:
 *           type: string
 *           enum: [buy, sell, neutral]
 *         strength:
 *           type: number
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *         indicatorCount:
 *           type: number
 *         bullishCount:
 *           type: number
 *         bearishCount:
 *           type: number
 *         neutralCount:
 *           type: number
 */

/**
 * @swagger
 * /api/indicators/advanced/{symbol}:
 *   get:
 *     summary: Obter todos os indicadores técnicos avançados
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Simbolo da criptomoeda (ex BTC ETH)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 1d
 *         description: Timeframe dos dados (1m, 5m, 1h, 1d)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *         description: Número de períodos para análise
 *     responses:
 *       200:
 *         description: Indicadores calculados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdvancedIndicators'
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/advanced/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', limit = 100 } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Símbolo é obrigatório'
      });
    }

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(
      symbol,
      timeframe as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: indicators,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter indicadores avançados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/summary/{symbol}:
 *   get:
 *     summary: Obter resumo de sinais dos indicadores
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *     responses:
 *       200:
 *         description: Resumo dos sinais
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IndicatorsSummary'
 */
router.get('/summary/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Símbolo é obrigatório'
      });
    }

    const summary = await technicalIndicatorsService.getIndicatorsSummary(symbol);

    res.json({
      success: true,
      data: summary,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter resumo dos indicadores:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/ichimoku/{symbol}:
 *   get:
 *     summary: Obter indicador Ichimoku Cloud
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: tenkanPeriod
 *         schema:
 *           type: number
 *           default: 9
 *         description: Período da linha Tenkan
 *       - in: query
 *         name: kijunPeriod
 *         schema:
 *           type: number
 *           default: 26
 *         description: Período da linha Kijun
 *       - in: query
 *         name: senkouBPeriod
 *         schema:
 *           type: number
 *           default: 52
 *         description: Período do Senkou Span B
 *     responses:
 *       200:
 *         description: Ichimoku Cloud calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IchimokuCloud'
 */
router.get('/ichimoku/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.ichimoku,
      parameters: {
        tenkanPeriod: parseInt(tenkanPeriod as string),
        kijunPeriod: parseInt(kijunPeriod as string),
        senkouBPeriod: parseInt(senkouBPeriod as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter Ichimoku:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/fibonacci/{symbol}:
 *   get:
 *     summary: Obter níveis de Fibonacci
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: lookbackPeriod
 *         schema:
 *           type: number
 *           default: 50
 *         description: Período de lookback para cálculo
 *     responses:
 *       200:
 *         description: Níveis de Fibonacci calculados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FibonacciRetracement'
 */
router.get('/fibonacci/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { lookbackPeriod = 50 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.fibonacci,
      parameters: {
        lookbackPeriod: parseInt(lookbackPeriod as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter Fibonacci:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/stochastic/{symbol}:
 *   get:
 *     summary: Obter Stochastic Oscillator
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: kPeriod
 *         schema:
 *           type: number
 *           default: 14
 *         description: Período %K
 *       - in: query
 *         name: dPeriod
 *         schema:
 *           type: number
 *           default: 3
 *         description: Período %D
 *     responses:
 *       200:
 *         description: Stochastic calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicalIndicatorResult'
 */
router.get('/stochastic/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { kPeriod = 14, dPeriod = 3 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.stochastic,
      parameters: {
        kPeriod: parseInt(kPeriod as string),
        dPeriod: parseInt(dPeriod as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter Stochastic:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/williamsr/{symbol}:
 *   get:
 *     summary: Obter Williams %R
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: period
 *         schema:
 *           type: number
 *           default: 14
 *         description: Período de cálculo
 *     responses:
 *       200:
 *         description: Williams %R calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicalIndicatorResult'
 */
router.get('/williamsr/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { period = 14 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.williamsr,
      parameters: {
        period: parseInt(period as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter Williams %R:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/cci/{symbol}:
 *   get:
 *     summary: Obter Commodity Channel Index
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: period
 *         schema:
 *           type: number
 *           default: 20
 *         description: Período de cálculo
 *     responses:
 *       200:
 *         description: CCI calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicalIndicatorResult'
 */
router.get('/cci/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { period = 20 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.cci,
      parameters: {
        period: parseInt(period as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter CCI:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/adx/{symbol}:
 *   get:
 *     summary: Obter Average Directional Index
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: period
 *         schema:
 *           type: number
 *           default: 14
 *         description: Período de cálculo
 *     responses:
 *       200:
 *         description: ADX calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicalIndicatorResult'
 */
router.get('/adx/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { period = 14 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.adx,
      parameters: {
        period: parseInt(period as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter ADX:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/parabolic-sar/{symbol}:
 *   get:
 *     summary: Obter Parabolic SAR
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: step
 *         schema:
 *           type: number
 *           default: 0.02
 *         description: Fator de aceleração inicial
 *       - in: query
 *         name: maxStep
 *         schema:
 *           type: number
 *           default: 0.2
 *         description: Fator de aceleração máximo
 *     responses:
 *       200:
 *         description: Parabolic SAR calculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TechnicalIndicatorResult'
 */
router.get('/parabolic-sar/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { step = 0.02, maxStep = 0.2 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);

    res.json({
      success: true,
      data: indicators.parabolicSar,
      parameters: {
        step: parseFloat(step as string),
        maxStep: parseFloat(maxStep as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter Parabolic SAR:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /api/indicators/signals/{symbol}:
 *   get:
 *     summary: Obter todos os sinais de trading
 *     tags: [Indicadores Técnicos]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [buy, sell, neutral, all]
 *           default: all
 *         description: Filtrar por tipo de sinal
 *       - in: query
 *         name: minStrength
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0
 *         description: Força mínima do sinal
 *     responses:
 *       200:
 *         description: Sinais de trading
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
 *                     $ref: '#/components/schemas/TechnicalSignal'
 */
router.get('/signals/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { type = 'all', minStrength = 0 } = req.query;

    const indicators = await technicalIndicatorsService.getAdvancedIndicators(symbol);
    
    // Coletar todos os sinais
    const allSignals = [
      ...indicators.ichimoku.signals,
      ...indicators.fibonacci.signals,
      ...indicators.stochastic.signals,
      ...indicators.williamsr.signals,
      ...indicators.cci.signals,
      ...indicators.adx.signals,
      ...indicators.parabolicSar.signals
    ];

    // Filtrar sinais
    let filteredSignals = allSignals;
    
    if (type !== 'all') {
      filteredSignals = filteredSignals.filter(signal => signal.type === type);
    }
    
    filteredSignals = filteredSignals.filter(signal => 
      signal.strength >= parseFloat(minStrength as string)
    );

    // Ordenar por timestamp (mais recentes primeiro)
    filteredSignals.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: filteredSignals,
      count: filteredSignals.length,
      filters: {
        type,
        minStrength: parseFloat(minStrength as string)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter sinais:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 