import { Router, Request, Response } from 'express';
import AdvancedTechnicalIndicators from '../services/advancedTechnicalIndicators';

const router = Router();
const advancedIndicators = AdvancedTechnicalIndicators.getInstance();

/**
 * @swagger
 * components:
 *   schemas:
 *     BollingerBands:
 *       type: object
 *       properties:
 *         upper:
 *           type: array
 *           items:
 *             type: number
 *         middle:
 *           type: array
 *           items:
 *             type: number
 *         lower:
 *           type: array
 *           items:
 *             type: number
 *         bandwidth:
 *           type: array
 *           items:
 *             type: number
 *         percentB:
 *           type: array
 *           items:
 *             type: number
 *         squeeze:
 *           type: array
 *           items:
 *             type: boolean
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     MACDAdvanced:
 *       type: object
 *       properties:
 *         macd:
 *           type: array
 *           items:
 *             type: number
 *         signal:
 *           type: array
 *           items:
 *             type: number
 *         histogram:
 *           type: array
 *           items:
 *             type: number
 *         divergence:
 *           type: array
 *           items:
 *             type: string
 *             enum: [bullish, bearish, none]
 *         momentum:
 *           type: array
 *           items:
 *             type: number
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     VolumeProfile:
 *       type: object
 *       properties:
 *         priceLevel:
 *           type: number
 *         volume:
 *           type: number
 *         percentage:
 *           type: number
 *         poc:
 *           type: number
 *         valueAreaHigh:
 *           type: number
 *         valueAreaLow:
 *           type: number
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     MarketStructure:
 *       type: object
 *       properties:
 *         higherHighs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: number
 *               price:
 *                 type: number
 *         lowerLows:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: number
 *               price:
 *                 type: number
 *         supportLevels:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               strength:
 *                 type: number
 *               touches:
 *                 type: number
 *         resistanceLevels:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               strength:
 *                 type: number
 *               touches:
 *                 type: number
 *         trend:
 *           type: string
 *           enum: [uptrend, downtrend, sideways]
 *         trendStrength:
 *           type: number
 *         signals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TechnicalSignal'
 *     
 *     AdvancedIndicatorsResult:
 *       type: object
 *       properties:
 *         bollingerBands:
 *           $ref: '#/components/schemas/BollingerBands'
 *         macdAdvanced:
 *           $ref: '#/components/schemas/MACDAdvanced'
 *         volumeProfile:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/VolumeProfile'
 *         marketStructure:
 *           $ref: '#/components/schemas/MarketStructure'
 *         overallSignal:
 *           type: object
 *           properties:
 *             direction:
 *               type: string
 *               enum: [buy, sell, neutral]
 *             strength:
 *               type: number
 *             confidence:
 *               type: number
 *             reasoning:
 *               type: array
 *               items:
 *                 type: string
 */

/**
 * @swagger
 * /api/advanced-indicators/analysis/{symbol}:
 *   get:
 *     summary: Obter análise completa de indicadores técnicos avançados
 *     tags: [Advanced Technical Indicators]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda (ex. BTCUSDT)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: 1d
 *         description: Timeframe dos dados (1m, 5m, 15m, 1h, 4h, 1d)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *         description: Número de períodos para análise
 *     responses:
 *       200:
 *         description: Análise completa dos indicadores avançados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdvancedIndicatorsResult'
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/analysis/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', limit = '200' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Símbolo é obrigatório',
        message: 'Por favor, forneça um símbolo válido (ex. BTCUSDT)'
      });
    }

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      timeframe as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
      symbol: symbol.toUpperCase(),
      timeframe,
      limit: parseInt(limit as string)
    });

  } catch (error) {
    console.error('Erro ao obter análise avançada:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter a análise dos indicadores avançados'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/bollinger/{symbol}:
 *   get:
 *     summary: Obter análise das Bandas de Bollinger avançadas
 *     tags: [Advanced Technical Indicators]
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
 *           type: integer
 *           default: 20
 *         description: Período para cálculo das bandas
 *       - in: query
 *         name: stdDev
 *         schema:
 *           type: number
 *           default: 2
 *         description: Desvio padrão para as bandas
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número de períodos
 *     responses:
 *       200:
 *         description: Análise das Bandas de Bollinger
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BollingerBands'
 */
router.get('/bollinger/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { period = '20', stdDev = '2', limit = '100' } = req.query;

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      '1d',
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: analysis.bollingerBands,
      parameters: {
        period: parseInt(period as string),
        stdDev: parseFloat(stdDev as string)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter Bandas de Bollinger:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível calcular as Bandas de Bollinger'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/macd/{symbol}:
 *   get:
 *     summary: Obter análise MACD avançada com divergências
 *     tags: [Advanced Technical Indicators]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: fastPeriod
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Período EMA rápida
 *       - in: query
 *         name: slowPeriod
 *         schema:
 *           type: integer
 *           default: 26
 *         description: Período EMA lenta
 *       - in: query
 *         name: signalPeriod
 *         schema:
 *           type: integer
 *           default: 9
 *         description: Período da linha de sinal
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número de períodos
 *     responses:
 *       200:
 *         description: Análise MACD avançada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MACDAdvanced'
 */
router.get('/macd/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { fastPeriod = '12', slowPeriod = '26', signalPeriod = '9', limit = '100' } = req.query;

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      '1d',
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: analysis.macdAdvanced,
      parameters: {
        fastPeriod: parseInt(fastPeriod as string),
        slowPeriod: parseInt(slowPeriod as string),
        signalPeriod: parseInt(signalPeriod as string)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter MACD avançado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível calcular o MACD avançado'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/volume-profile/{symbol}:
 *   get:
 *     summary: Obter perfil de volume
 *     tags: [Advanced Technical Indicators]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: bins
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número de bins para o perfil de volume
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *         description: Número de períodos
 *     responses:
 *       200:
 *         description: Perfil de volume
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
 *                     $ref: '#/components/schemas/VolumeProfile'
 */
router.get('/volume-profile/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { bins = '50', limit = '200' } = req.query;

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      '1d',
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: analysis.volumeProfile,
      parameters: {
        bins: parseInt(bins as string)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter perfil de volume:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível calcular o perfil de volume'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/market-structure/{symbol}:
 *   get:
 *     summary: Obter análise de estrutura de mercado
 *     tags: [Advanced Technical Indicators]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Símbolo da criptomoeda
 *       - in: query
 *         name: lookback
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Períodos para análise de estrutura
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *         description: Número de períodos
 *     responses:
 *       200:
 *         description: Análise de estrutura de mercado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MarketStructure'
 */
router.get('/market-structure/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { lookback = '50', limit = '200' } = req.query;

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      '1d',
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: analysis.marketStructure,
      parameters: {
        lookback: parseInt(lookback as string)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter estrutura de mercado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível analisar a estrutura de mercado'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/signals/{symbol}:
 *   get:
 *     summary: Obter sinais consolidados de todos os indicadores
 *     tags: [Advanced Technical Indicators]
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
 *           default: 1d
 *         description: Timeframe dos dados
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número de períodos
 *     responses:
 *       200:
 *         description: Sinais consolidados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overallSignal:
 *                       type: object
 *                       properties:
 *                         direction:
 *                           type: string
 *                           enum: [buy, sell, neutral]
 *                         strength:
 *                           type: number
 *                         confidence:
 *                           type: number
 *                         reasoning:
 *                           type: array
 *                           items:
 *                             type: string
 *                     recentSignals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TechnicalSignal'
 */
router.get('/signals/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', limit = '100' } = req.query;

    const analysis = await advancedIndicators.getAdvancedAnalysis(
      symbol.toUpperCase(),
      timeframe as string,
      parseInt(limit as string)
    );

    // Consolidar todos os sinais
    const allSignals = [
      ...analysis.bollingerBands.signals,
      ...analysis.macdAdvanced.signals,
      ...analysis.marketStructure.signals
    ].sort((a, b) => b.timestamp - a.timestamp);

    const recentSignals = allSignals.slice(0, 20);

    res.json({
      success: true,
      data: {
        overallSignal: analysis.overallSignal,
        recentSignals,
        signalCounts: {
          total: allSignals.length,
          buy: allSignals.filter(s => s.type === 'buy').length,
          sell: allSignals.filter(s => s.type === 'sell').length,
          neutral: allSignals.filter(s => s.type === 'neutral').length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter sinais consolidados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter os sinais consolidados'
    });
  }
});

/**
 * @swagger
 * /api/advanced-indicators/compare:
 *   post:
 *     summary: Comparar indicadores entre múltiplas criptomoedas
 *     tags: [Advanced Technical Indicators]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de símbolos para comparar
 *               timeframe:
 *                 type: string
 *                 default: 1d
 *                 description: Timeframe dos dados
 *               indicators:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [bollinger, macd, volume, structure]
 *                 description: Indicadores para incluir na comparação
 *     responses:
 *       200:
 *         description: Comparação de indicadores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { symbols, timeframe = '1d', indicators = ['bollinger', 'macd', 'structure'] } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Símbolos inválidos',
        message: 'Por favor, forneça uma lista de símbolos válidos'
      });
    }

    if (symbols.length > 10) {
      return res.status(400).json({
        error: 'Muitos símbolos',
        message: 'Máximo de 10 símbolos permitidos para comparação'
      });
    }

    const comparisons: any = {};

    for (const symbol of symbols) {
      try {
        const analysis = await advancedIndicators.getAdvancedAnalysis(
          symbol.toUpperCase(),
          timeframe,
          100
        );

        comparisons[symbol.toUpperCase()] = {
          overallSignal: analysis.overallSignal,
          indicators: {}
        };

        if (indicators.includes('bollinger')) {
          const latest = analysis.bollingerBands;
          comparisons[symbol.toUpperCase()].indicators.bollinger = {
            squeeze: latest.squeeze[latest.squeeze.length - 1],
            percentB: latest.percentB[latest.percentB.length - 1],
            bandwidth: latest.bandwidth[latest.bandwidth.length - 1],
            signalCount: latest.signals.length
          };
        }

        if (indicators.includes('macd')) {
          const latest = analysis.macdAdvanced;
          comparisons[symbol.toUpperCase()].indicators.macd = {
            histogram: latest.histogram[latest.histogram.length - 1],
            divergence: latest.divergence[latest.divergence.length - 1],
            momentum: latest.momentum[latest.momentum.length - 1],
            signalCount: latest.signals.length
          };
        }

        if (indicators.includes('structure')) {
          const latest = analysis.marketStructure;
          comparisons[symbol.toUpperCase()].indicators.structure = {
            trend: latest.trend,
            trendStrength: latest.trendStrength,
            supportLevels: latest.supportLevels.length,
            resistanceLevels: latest.resistanceLevels.length,
            signalCount: latest.signals.length
          };
        }

      } catch (error) {
        console.warn(`Erro ao analisar ${symbol}:`, error);
        comparisons[symbol.toUpperCase()] = {
          error: 'Não foi possível analisar este símbolo'
        };
      }
    }

    res.json({
      success: true,
      data: comparisons,
      metadata: {
        symbolCount: symbols.length,
        timeframe,
        indicators,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na comparação de indicadores:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível realizar a comparação'
    });
  }
});

export default router; 