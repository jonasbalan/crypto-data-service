import { logger } from '../../utils/logger';
import { querySimilarVectors } from '../vector/embedding';
import { cachedResult } from '../cache/cacheService';
import { CryptoAsset } from '../../models/crypto';

/**
 * Interface para análise de tendência
 */
export interface TrendAnalysis {
  symbol: string;
  direction: 'alta' | 'baixa' | 'lateral';
  confidence: number;
  timeframe: '24h' | '7d' | '30d';
  factors: string[];
  prediction: {
    priceTarget?: number;
    timeTarget?: string;
    probabilityPercent: number;
  };
  updatedAt: string;
}

/**
 * Interface para correlação de ativos
 */
export interface AssetCorrelation {
  baseSymbol: string;
  correlatedAssets: Array<{
    symbol: string;
    correlationCoefficient: number;
    relationship: 'forte_positiva' | 'moderada_positiva' | 'fraca' | 'moderada_negativa' | 'forte_negativa';
  }>;
  timeframe: '30d' | '90d' | '1y';
  updatedAt: string;
}

/**
 * Interface para insights de mercado
 */
export interface MarketInsight {
  type: 'tendência_geral' | 'alta_volatilidade' | 'volume_anormal' | 'divergência_técnica' | 'sentimento_social';
  description: string;
  affectedAssets: string[];
  importance: 'baixa' | 'média' | 'alta' | 'crítica';
  confidence: number;
  action?: string;
  updatedAt: string;
}

/**
 * Analisa a tendência de um ativo com base em dados históricos e vetorias
 * @param symbol Símbolo do ativo
 * @param timeframe Período de tempo para análise
 */
export async function analyzeTrend(
  symbol: string,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<TrendAnalysis> {
  // Usar cache para evitar recálculos frequentes
  const cacheKey = `trend:${symbol}:${timeframe}`;
  const cacheTTL = timeframe === '24h' ? 30 * 60 * 1000 : 3 * 60 * 60 * 1000; // 30 min para 24h, 3h para outros
  
  return cachedResult(cacheKey, async () => {
    try {
      // Buscar ativo
      const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
      
      if (!asset) {
        throw new Error(`Ativo não encontrado: ${symbol}`);
      }
      
      // Em um ambiente real, usaríamos algoritmos de ML treinados para detectar padrões
      // e fazer previsões. Para este exemplo, simularemos uma análise:
      
      // 1. Determinar direção da tendência com base em histórico de preços simulado
      const priceHistory = asset.priceHistory || [];
      const recentChanges = priceHistory.slice(0, 3).map(ph => ph.change24h || 0);
      
      let direction: 'alta' | 'baixa' | 'lateral' = 'lateral';
      let confidence = 0.5; // valor base
      let factors = [];
      
      // Simular determinação de tendência
      const avgChange = recentChanges.reduce((sum, val) => sum + val, 0) / recentChanges.length || 0;
      
      if (avgChange > 1.5) {
        direction = 'alta';
        confidence = 0.7 + Math.min(avgChange / 20, 0.2); // 0.7 - 0.9
        factors.push('Aumento consistente de preço');
      } else if (avgChange < -1.5) {
        direction = 'baixa';
        confidence = 0.7 + Math.min(Math.abs(avgChange) / 20, 0.2); // 0.7 - 0.9
        factors.push('Queda consistente de preço');
      } else {
        direction = 'lateral';
        confidence = 0.8;
        factors.push('Preço estável');
      }
      
      // 2. Usar dados vetoriais para encontrar padrões similares no passado
      // Consultar vetores similares
      const assetVector = await generateTechnicalVector(asset, timeframe);
      const similarPatterns = await querySimilarVectors(assetVector, 5, {
        type: 'technical',
        symbol: { $ne: symbol } // Excluir o próprio ativo
      });
      
      // 3. Determinar mais fatores baseados em padrões similares
      const patternDirections = similarPatterns.map((pattern: any) => {
        return pattern.metadata?.direction || null;
      }).filter(Boolean);
      
      // Se a maioria dos padrões similares têm a mesma direção, aumentar a confiança
      if (patternDirections.length > 0) {
        // Contar ocorrências de cada direção
        const directionCounts: Record<string, number> = {};
        
        // Contar manualmente cada direção
        for (const dir of patternDirections) {
          if (typeof dir === 'string') {
            directionCounts[dir] = (directionCounts[dir] || 0) + 1;
          }
        }
        
        const totalPatterns = patternDirections.length;
        let maxCount = 0;
        let dominantDirection = '';
        
        // Encontrar a direção com mais ocorrências
        for (const dir in directionCounts) {
          if (directionCounts[dir] > maxCount) {
            maxCount = directionCounts[dir];
            dominantDirection = dir;
          }
        }
        
        // Se mais de 70% dos padrões similares apontam para a mesma direção
        if (maxCount / totalPatterns > 0.7) {
          if (dominantDirection === direction) {
            // Aumentar confiança se confirmar a direção inicial
            confidence = Math.min(confidence + 0.1, 0.95);
            factors.push('Padrões históricos similares confirmam a tendência');
          } else {
            // Diminuir confiança se contradizer
            confidence = Math.max(confidence - 0.15, 0.3);
            factors.push('Padrões históricos similares contradizem a tendência atual');
          }
        }
      }
      
      // 4. Dados de sentimento social (simulados)
      const sentimentFactor = Math.random() > 0.5 ? 0.05 : -0.05;
      confidence = Math.max(0.2, Math.min(0.95, confidence + sentimentFactor));
      factors.push(sentimentFactor > 0 
        ? 'Sentimento social positivo' 
        : 'Sentimento social misto');
      
      // Determinar alvo de preço (simples para este exemplo)
      let priceTarget;
      if (direction !== 'lateral') {
        const currentPrice = asset.currentPrice || 0;
        const changePercent = direction === 'alta' ? 
          confidence * 10 : -confidence * 10;
        priceTarget = currentPrice * (1 + changePercent / 100);
      }
      
      const analysis: TrendAnalysis = {
        symbol: symbol.toUpperCase(),
        direction,
        confidence,
        timeframe,
        factors,
        prediction: {
          priceTarget,
          timeTarget: new Date(Date.now() + (
            timeframe === '24h' ? 24 * 60 * 60 * 1000 :
            timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 :
            30 * 24 * 60 * 60 * 1000
          )).toISOString(),
          probabilityPercent: Math.round(confidence * 100)
        },
        updatedAt: new Date().toISOString()
      };
      
      return analysis;
    } catch (error) {
      logger.error(`Erro ao analisar tendência para ${symbol}:`, error);
      throw error;
    }
  }, cacheTTL);
}

/**
 * Encontra correlações entre ativos de criptomoedas
 * @param symbol Símbolo do ativo base
 * @param timeframe Período de análise
 * @param limit Número máximo de correlações
 */
export async function findAssetCorrelations(
  symbol: string,
  timeframe: '30d' | '90d' | '1y' = '30d',
  limit: number = 5
): Promise<AssetCorrelation> {
  const cacheKey = `correlation:${symbol}:${timeframe}:${limit}`;
  const cacheTTL = 6 * 60 * 60 * 1000; // 6 horas
  
  return cachedResult(cacheKey, async () => {
    try {
      // Buscar ativo base
      const baseAsset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
      
      if (!baseAsset) {
        throw new Error(`Ativo não encontrado: ${symbol}`);
      }
      
      // Buscar outros ativos
      const otherAssets = await CryptoAsset.find(
        { symbol: { $ne: symbol.toUpperCase() } }
      ).limit(20);
      
      // Calcular correlações (simulado)
      const correlations = otherAssets.map(asset => {
        // Em um caso real, calcularíamos a correlação de Pearson ou Spearman
        // baseada em dados históricos de preço
        const randomCorrelation = (Math.random() * 2 - 1);
        
        let relationship: 'forte_positiva' | 'moderada_positiva' | 'fraca' | 'moderada_negativa' | 'forte_negativa';
        
        if (randomCorrelation > 0.7) relationship = 'forte_positiva';
        else if (randomCorrelation > 0.3) relationship = 'moderada_positiva';
        else if (randomCorrelation > -0.3) relationship = 'fraca';
        else if (randomCorrelation > -0.7) relationship = 'moderada_negativa';
        else relationship = 'forte_negativa';
        
        return {
          symbol: asset.symbol,
          correlationCoefficient: randomCorrelation,
          relationship
        };
      });
      
      // Ordenar por valor absoluto da correlação e limitar
      const sortedCorrelations = correlations
        .sort((a, b) => Math.abs(b.correlationCoefficient) - Math.abs(a.correlationCoefficient))
        .slice(0, limit);
      
      return {
        baseSymbol: symbol.toUpperCase(),
        correlatedAssets: sortedCorrelations,
        timeframe,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Erro ao buscar correlações para ${symbol}:`, error);
      throw error;
    }
  }, cacheTTL);
}

/**
 * Gera insights de mercado com base em análises
 * @param count Número de insights a gerar
 */
export async function generateMarketInsights(count: number = 3): Promise<MarketInsight[]> {
  const cacheKey = `insights:${count}`;
  const cacheTTL = 60 * 60 * 1000; // 1 hora
  
  return cachedResult(cacheKey, async () => {
    try {
      // Buscar alguns ativos para análise
      const assets = await CryptoAsset.find({}).limit(20);
      
      if (!assets.length) {
        throw new Error('Nenhum ativo encontrado para análise');
      }
      
      // Tipos de insights possíveis
      const insightTypes: Array<'tendência_geral' | 'alta_volatilidade' | 'volume_anormal' | 'divergência_técnica' | 'sentimento_social'> = [
        'tendência_geral', 'alta_volatilidade', 'volume_anormal', 'divergência_técnica', 'sentimento_social'
      ];
      
      // Gerar insights aleatórios (em um cenário real, usaríamos algoritmos de análise)
      const insights: MarketInsight[] = [];
      
      for (let i = 0; i < count; i++) {
        // Selecionar tipo de insight
        const type = insightTypes[Math.floor(Math.random() * insightTypes.length)];
        
        // Selecionar de 1 a 4 ativos aleatórios
        const numAssets = Math.floor(Math.random() * 4) + 1;
        const affectedAssets = assets
          .sort(() => 0.5 - Math.random())
          .slice(0, numAssets)
          .map(asset => asset.symbol);
        
        // Definir importância
        const importanceMap: Array<'baixa' | 'média' | 'alta' | 'crítica'> = ['baixa', 'média', 'alta', 'crítica'];
        const importance = importanceMap[Math.floor(Math.random() * importanceMap.length)];
        
        // Gerar descrição com base no tipo
        let description = '';
        let action = '';
        
        switch (type) {
          case 'tendência_geral':
            description = `Tendência de ${Math.random() > 0.5 ? 'alta' : 'baixa'} identificada para os próximos dias`;
            action = Math.random() > 0.5 ? 
              'Considerar entradas de curto prazo seguindo a tendência' : 
              'Monitorar pontos de reversão potenciais';
            break;
          case 'alta_volatilidade':
            description = 'Aumento significativo na volatilidade detectado';
            action = 'Ajustar stop-loss e considerar redução de exposição';
            break;
          case 'volume_anormal':
            description = `Volume de transações ${Math.random() > 0.5 ? 'muito acima' : 'muito abaixo'} da média`;
            action = 'Investigar possíveis notícias ou eventos não divulgados';
            break;
          case 'divergência_técnica':
            description = 'Divergência entre preço e indicadores técnicos detectada';
            action = 'Alerta de possível reversão de tendência';
            break;
          case 'sentimento_social':
            description = `Sentimento social ${Math.random() > 0.5 ? 'extremamente positivo' : 'extremamente negativo'}`;
            action = Math.random() > 0.5 ? 
              'Monitorar possível FOMO (medo de ficar de fora)' : 
              'Atenção para possível pânico de venda';
            break;
        }
        
        insights.push({
          type,
          description,
          affectedAssets,
          importance,
          confidence: Number((0.6 + Math.random() * 0.35).toFixed(2)),
          action,
          updatedAt: new Date().toISOString()
        });
      }
      
      return insights;
    } catch (error) {
      logger.error('Erro ao gerar insights de mercado:', error);
      throw error;
    }
  }, cacheTTL);
}

/**
 * Gera vetor técnico simulado para um ativo
 * Em um ambiente real, isso seria feito com modelos de ML
 * @param asset Ativo de criptomoeda
 * @param timeframe Período de tempo
 */
async function generateTechnicalVector(
  asset: any,
  timeframe: string
): Promise<number[]> {
  // Simular vetor técnico para o exemplo
  const vector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  
  // Normalizar o vetor
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  const normalizedVector = vector.map(val => val / magnitude);
  
  return normalizedVector;
} 