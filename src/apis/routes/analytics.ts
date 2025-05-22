import express, { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { CryptoAsset } from '../../models/crypto';
import { getPineconeClient } from '../../database/init';
import { querySimilarVectors } from '../../services/vector/embedding';

// Criar router
const router = express.Router();

/**
 * @route GET /api/analytics/market-overview
 * @description Obtém visão geral do mercado
 */
router.get('/market-overview', async (req: Request, res: Response) => {
  try {
    // Obter os ativos ordenados por capitalização de mercado
    const topAssets = await CryptoAsset.find({})
      .sort({ currentPrice: -1 })
      .limit(10)
      .select('symbol name currentPrice priceHistory');
    
    // Calcular estatísticas do mercado
    let totalMarketCap = 0;
    let totalVolume24h = 0;
    let marketSentiment = 0;
    
    // Para cada ativo, obter os dados mais recentes
    for (const asset of topAssets) {
      const latestPriceData = asset.priceHistory[0];
      if (latestPriceData) {
        totalMarketCap += latestPriceData.marketCap || 0;
        totalVolume24h += latestPriceData.volume24h || 0;
      }
      
      // Somar variações para calcular sentimento (simplificado)
      marketSentiment += latestPriceData?.change24h || 0;
    }
    
    // Calcular sentimento médio 
    marketSentiment = marketSentiment / topAssets.length;
    
    // Determinar status do mercado
    let marketStatus: string;
    if (marketSentiment > 5) {
      marketStatus = 'Altamente Positivo';
    } else if (marketSentiment > 2) {
      marketStatus = 'Positivo';
    } else if (marketSentiment > -2) {
      marketStatus = 'Neutro';
    } else if (marketSentiment > -5) {
      marketStatus = 'Negativo';
    } else {
      marketStatus = 'Altamente Negativo';
    }
    
    // Responder com os resultados
    res.status(200).json({
      marketOverview: {
        totalMarketCap,
        totalVolume24h,
        marketSentiment,
        marketStatus,
        timestamp: new Date()
      },
      topAssets: topAssets.map(asset => ({
        symbol: asset.symbol,
        name: asset.name,
        price: asset.currentPrice,
        change24h: asset.priceHistory[0]?.change24h || 0
      }))
    });
  } catch (error) {
    logger.error('Erro ao obter visão geral do mercado:', error);
    res.status(500).json({ error: 'Erro ao obter dados do mercado' });
  }
});

/**
 * @route GET /api/analytics/trends
 * @description Obtém tendências do mercado
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    // Calcular data de início
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Obter ativos com maior variação positiva e negativa
    const assets = await CryptoAsset.find({
      'priceHistory.timestamp': { $gte: startDate }
    }).select('symbol name currentPrice priceHistory');
    
    // Processar dados para identificar tendências
    const assetTrends = assets.map(asset => {
      // Filtrar histórico de preços pelo período
      const priceHistory = asset.priceHistory.filter(
        ph => new Date(ph.timestamp) >= startDate
      );
      
      // Calcular variação no período
      const oldestPrice = priceHistory[priceHistory.length - 1]?.price || 0;
      const newestPrice = priceHistory[0]?.price || 0;
      const priceChange = oldestPrice > 0 ? 
        ((newestPrice - oldestPrice) / oldestPrice) * 100 : 0;
      
      return {
        symbol: asset.symbol,
        name: asset.name,
        currentPrice: asset.currentPrice,
        priceChange,
        volume24h: priceHistory[0]?.volume24h || 0
      };
    });
    
    // Ordenar por variação de preço
    const sortedByChange = [...assetTrends].sort((a, b) => b.priceChange - a.priceChange);
    
    // Extrair top gainers e losers
    const topGainers = sortedByChange.slice(0, 5);
    const topLosers = sortedByChange.slice(-5).reverse();
    
    // Ordenar por volume
    const topByVolume = [...assetTrends]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 5);
    
    // Responder com os resultados
    res.status(200).json({
      period: {
        days,
        startDate,
        endDate: new Date()
      },
      trends: {
        topGainers,
        topLosers,
        topByVolume
      }
    });
  } catch (error) {
    logger.error('Erro ao obter tendências:', error);
    res.status(500).json({ error: 'Erro ao analisar tendências' });
  }
});

/**
 * @route GET /api/analytics/correlations/:symbol
 * @description Encontra correlações entre um ativo e outros
 */
router.get('/correlations/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    // Verificar parâmetro
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do ativo é obrigatório' });
    }
    
    // Calcular data de início
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Obter o ativo principal
    const mainAsset = await CryptoAsset.findOne({ 
      symbol: symbol.toUpperCase() 
    }).select('symbol name priceHistory');
    
    if (!mainAsset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    
    // Filtrar histórico de preços pelo período
    const mainPriceHistory = mainAsset.priceHistory.filter(
      ph => new Date(ph.timestamp) >= startDate
    );
    
    if (mainPriceHistory.length < 2) {
      return res.status(400).json({ 
        error: 'Dados históricos insuficientes para o período solicitado' 
      });
    }
    
    // Obter outros ativos para comparação
    const otherAssets = await CryptoAsset.find({ 
      symbol: { $ne: symbol.toUpperCase() } 
    }).select('symbol name priceHistory').limit(20);
    
    // Calcular correlações
    const correlations = [];
    
    for (const asset of otherAssets) {
      // Filtrar histórico de preços pelo período
      const assetPriceHistory = asset.priceHistory.filter(
        ph => new Date(ph.timestamp) >= startDate
      );
      
      if (assetPriceHistory.length < 2) {
        continue; // Pular se não houver dados suficientes
      }
      
      // Calcular coeficiente de correlação de Pearson
      const correlation = calculateCorrelation(
        mainPriceHistory.map(ph => ph.price),
        assetPriceHistory.map(ph => ph.price)
      );
      
      // Adicionar à lista de correlações se for significativa
      if (!isNaN(correlation)) {
        correlations.push({
          symbol: asset.symbol,
          name: asset.name,
          correlation: parseFloat(correlation.toFixed(4)),
          relationship: categorizeCorrelation(correlation)
        });
      }
    }
    
    // Ordenar por correlação (valor absoluto, para mostrar tanto correlações fortes positivas quanto negativas)
    const sortedCorrelations = correlations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    );
    
    // Responder com os resultados
    res.status(200).json({
      asset: {
        symbol: mainAsset.symbol,
        name: mainAsset.name
      },
      period: {
        days,
        startDate,
        endDate: new Date()
      },
      correlations: sortedCorrelations.slice(0, 10) // Top 10 correlações
    });
  } catch (error) {
    logger.error(`Erro ao calcular correlações para ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Erro ao calcular correlações' });
  }
});

/**
 * @route POST /api/analytics/recommendation
 * @description Gera recomendações de operações com base em dados históricos
 */
router.post('/recommendation', async (req: Request, res: Response) => {
  try {
    // Obter parâmetros da requisição
    const { symbols, riskLevel = 'medium' } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ 
        error: 'Forneça uma lista de símbolos para análise' 
      });
    }
    
    // Converter símbolos para maiúsculas
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    // Obter ativos
    const assets = await CryptoAsset.find({ 
      symbol: { $in: normalizedSymbols } 
    }).select('symbol name currentPrice priceHistory technicalData');
    
    // Gerar recomendações
    const recommendations = [];
    
    for (const asset of assets) {
      // Analisar dados técnicos
      const technicalSignals = analyzeAssetTechnicals(asset);
      
      // Analisar tendência de preço
      const priceTrend = analyzePriceTrend(asset);
      
      // Calcular pontuação da recomendação com base no nível de risco
      const score = calculateRecommendationScore(technicalSignals, priceTrend, riskLevel);
      
      // Determinar tipo de recomendação
      let recommendation;
      if (score > 70) {
        recommendation = 'Compra Forte';
      } else if (score > 55) {
        recommendation = 'Compra';
      } else if (score > 45) {
        recommendation = 'Neutro';
      } else if (score > 30) {
        recommendation = 'Venda';
      } else {
        recommendation = 'Venda Forte';
      }
      
      // Adicionar à lista de recomendações
      recommendations.push({
        symbol: asset.symbol,
        name: asset.name,
        currentPrice: asset.currentPrice,
        recommendation,
        score,
        technicalSignals,
        priceTrend
      });
    }
    
    // Ordenar por pontuação
    const sortedRecommendations = recommendations.sort((a, b) => b.score - a.score);
    
    // Responder com os resultados
    res.status(200).json({
      riskLevel,
      timestamp: new Date(),
      recommendations: sortedRecommendations
    });
  } catch (error) {
    logger.error('Erro ao gerar recomendações:', error);
    res.status(500).json({ error: 'Erro ao gerar recomendações' });
  }
});

/**
 * Calcula o coeficiente de correlação de Pearson entre duas séries
 * @param seriesX Primeira série de dados
 * @param seriesY Segunda série de dados
 * @returns Coeficiente de correlação
 */
function calculateCorrelation(seriesX: number[], seriesY: number[]): number {
  // Obter o tamanho mínimo entre as duas séries
  const n = Math.min(seriesX.length, seriesY.length);
  
  // Se não houver pontos suficientes, retornar NaN
  if (n < 2) return NaN;
  
  // Usar apenas os n primeiros pontos de cada série
  seriesX = seriesX.slice(0, n);
  seriesY = seriesY.slice(0, n);
  
  // Calcular médias
  const meanX = seriesX.reduce((sum, val) => sum + val, 0) / n;
  const meanY = seriesY.reduce((sum, val) => sum + val, 0) / n;
  
  // Calcular desvios e produtos
  let ssXY = 0; // Soma do produto dos desvios
  let ssX = 0;  // Soma dos quadrados dos desvios de X
  let ssY = 0;  // Soma dos quadrados dos desvios de Y
  
  for (let i = 0; i < n; i++) {
    const dx = seriesX[i] - meanX;
    const dy = seriesY[i] - meanY;
    ssXY += dx * dy;
    ssX += dx * dx;
    ssY += dy * dy;
  }
  
  // Calcular coeficiente de correlação
  return ssXY / Math.sqrt(ssX * ssY);
}

/**
 * Categoriza a correlação em texto
 * @param correlation Coeficiente de correlação
 * @returns Descrição da correlação
 */
function categorizeCorrelation(correlation: number): string {
  const absCorr = Math.abs(correlation);
  const direction = correlation >= 0 ? 'Positiva' : 'Negativa';
  
  if (absCorr > 0.7) {
    return `Forte ${direction}`;
  } else if (absCorr > 0.5) {
    return `Moderada ${direction}`;
  } else if (absCorr > 0.3) {
    return `Fraca ${direction}`;
  } else {
    return 'Sem correlação significativa';
  }
}

/**
 * Analisa indicadores técnicos de um ativo
 * @param asset Ativo de criptomoeda
 * @returns Análise dos indicadores técnicos
 */
function analyzeAssetTechnicals(asset: any): any {
  // Inicializar contadores
  let buySignals = 0;
  let sellSignals = 0;
  let neutralSignals = 0;
  
  // Contar sinais dos indicadores técnicos
  if (asset.technicalData && asset.technicalData.length > 0) {
    for (const indicator of asset.technicalData) {
      if (indicator.signal === 'buy') {
        buySignals++;
      } else if (indicator.signal === 'sell') {
        sellSignals++;
      } else {
        neutralSignals++;
      }
    }
  }
  
  // Calcular sinal geral
  const totalSignals = buySignals + sellSignals + neutralSignals;
  const buyPercentage = totalSignals > 0 ? (buySignals / totalSignals) * 100 : 0;
  const sellPercentage = totalSignals > 0 ? (sellSignals / totalSignals) * 100 : 0;
  
  let overallSignal;
  if (buyPercentage > 60) {
    overallSignal = 'Compra';
  } else if (sellPercentage > 60) {
    overallSignal = 'Venda';
  } else {
    overallSignal = 'Neutro';
  }
  
  return {
    buySignals,
    sellSignals,
    neutralSignals,
    totalSignals,
    buyPercentage: parseFloat(buyPercentage.toFixed(2)),
    sellPercentage: parseFloat(sellPercentage.toFixed(2)),
    overallSignal
  };
}

/**
 * Analisa tendência de preço de um ativo
 * @param asset Ativo de criptomoeda
 * @returns Análise da tendência de preço
 */
function analyzePriceTrend(asset: any): any {
  // Obter histórico de preços (até 30 dias, se disponível)
  const priceHistory = asset.priceHistory.slice(0, 30);
  
  if (priceHistory.length < 2) {
    return {
      trend: 'Indefinida',
      change7d: 0,
      change30d: 0,
      volatility: 0
    };
  }
  
  // Calcular variações
  const currentPrice = priceHistory[0].price;
  const price7dAgo = priceHistory.find((ph: { timestamp: number }) =>
    new Date(ph.timestamp).getTime() <= 
    new Date().getTime() - 7 * 24 * 60 * 60 * 1000
  )?.price || priceHistory[priceHistory.length - 1].price;
  
  const price30dAgo = priceHistory[priceHistory.length - 1].price;
  
  const change7d = price7dAgo > 0 ? 
    ((currentPrice - price7dAgo) / price7dAgo) * 100 : 0;
    
  const change30d = price30dAgo > 0 ? 
    ((currentPrice - price30dAgo) / price30dAgo) * 100 : 0;
  
  // Calcular volatilidade (desvio padrão das variações diárias)
  const dailyChanges = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const prevPrice = priceHistory[i].price;
    const currPrice = priceHistory[i-1].price;
    if (prevPrice > 0) {
      dailyChanges.push(((currPrice - prevPrice) / prevPrice) * 100);
    }
  }
  
  // Calcular desvio padrão
  const mean = dailyChanges.reduce((sum, val) => sum + val, 0) / dailyChanges.length;
  const variance = dailyChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyChanges.length;
  const volatility = Math.sqrt(variance);
  
  // Determinar tendência
  let trend;
  if (change30d > 15) {
    trend = 'Forte Alta';
  } else if (change30d > 5) {
    trend = 'Alta';
  } else if (change30d > -5) {
    trend = 'Lateral';
  } else if (change30d > -15) {
    trend = 'Baixa';
  } else {
    trend = 'Forte Baixa';
  }
  
  return {
    trend,
    change7d: parseFloat(change7d.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2))
  };
}

/**
 * Calcula pontuação para recomendação com base em indicadores e risco
 * @param technicalSignals Análise de indicadores técnicos
 * @param priceTrend Análise de tendência de preço
 * @param riskLevel Nível de risco
 * @returns Pontuação da recomendação (0-100)
 */
function calculateRecommendationScore(
  technicalSignals: any, 
  priceTrend: any, 
  riskLevel: string
): number {
  // Base para a pontuação
  let score = 50;
  
  // Ajustar com base nos sinais técnicos
  if (technicalSignals.overallSignal === 'Compra') {
    score += 15;
  } else if (technicalSignals.overallSignal === 'Venda') {
    score -= 15;
  }
  
  // Ponderação dos sinais técnicos
  score += (technicalSignals.buyPercentage - technicalSignals.sellPercentage) * 0.2;
  
  // Ajustar com base na tendência de preço
  switch (priceTrend.trend) {
    case 'Forte Alta':
      score += 15;
      break;
    case 'Alta':
      score += 10;
      break;
    case 'Baixa':
      score -= 10;
      break;
    case 'Forte Baixa':
      score -= 15;
      break;
  }
  
  // Ajustar com base na variação de 7 dias
  score += priceTrend.change7d * 0.3;
  
  // Ajustar para o nível de risco
  switch (riskLevel) {
    case 'high':
      // Alto risco: favorece movimentos mais fortes e recentes
      score += priceTrend.change7d * 0.5;
      if (priceTrend.volatility > 5) {
        score += 5;
      }
      break;
    case 'low':
      // Baixo risco: penaliza alta volatilidade
      score -= priceTrend.volatility * 1.5;
      break;
  }
  
  // Limitar a pontuação entre 0 e 100
  return Math.max(0, Math.min(100, score));
}

export default router; 