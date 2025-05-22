import axios from 'axios';
import { logger } from '../../utils/logger';
import { cachedResult } from '../cache/cacheService';
import { ollamaService } from '../ollamaService';

// Interface para resultados de análise de sentimento
export interface SentimentResult {
  symbol: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 (extremamente negativo) a 1 (extremamente positivo)
  sources: {
    twitter: number;
    reddit: number;
    news: number;
  };
  confidence: number; // 0 a 100
  timestamp: string;
  keywords: Array<{ word: string; frequency: number; sentiment: number }>;
}

// Cache TTL para análise de sentimento
const SENTIMENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Analisa o sentimento do mercado para uma criptomoeda específica
 * Combina dados de redes sociais e notícias
 */
export async function analyzeSentiment(symbol: string): Promise<SentimentResult> {
  const cacheKey = `sentiment:${symbol.toLowerCase()}`;
  
  return cachedResult(cacheKey, async () => {
    try {
      logger.info(`Analisando sentimento para ${symbol}`);
      
      // Buscar dados reais de diferentes fontes ou simulá-los
      const [twitterData, redditData, newsData] = await Promise.all([
        fetchTwitterData(symbol),
        fetchRedditData(symbol),
        fetchNewsData(symbol)
      ]);
      
      // Analisar sentimento usando Ollama (ou fallback para simulação)
      const [twitterSentiment, redditSentiment, newsSentiment] = await Promise.all([
        analyzeSourceSentiment(twitterData, 'twitter', symbol),
        analyzeSourceSentiment(redditData, 'reddit', symbol),
        analyzeSourceSentiment(newsData, 'news', symbol)
      ]);
      
      // Calcular sentimento médio ponderado
      const weights = {
        twitter: 0.4, // 40% peso para Twitter
        reddit: 0.3,  // 30% peso para Reddit
        news: 0.3     // 30% peso para notícias
      };
      
      const weightedScore = (
        twitterSentiment.score * weights.twitter +
        redditSentiment.score * weights.reddit +
        newsSentiment.score * weights.news
      );
      
      // Determinar sentimento geral
      let overallSentiment: 'bullish' | 'bearish' | 'neutral';
      if (weightedScore > 0.2) {
        overallSentiment = 'bullish';
      } else if (weightedScore < -0.2) {
        overallSentiment = 'bearish';
      } else {
        overallSentiment = 'neutral';
      }
      
      // Calcular confiança com base na quantidade de dados
      const totalSamples = 
        twitterData.length + 
        redditData.length + 
        newsData.length;
      
      // Confiança baseada em quantidade e diversidade de dados
      const minSamplesForHighConfidence = 1000;
      const confidence = Math.min(
        (totalSamples / minSamplesForHighConfidence) * 100,
        95 // Máximo de 95% de confiança
      );
      
      // Combinar e agregar palavras-chave de todas as fontes
      const allKeywords = [
        ...twitterSentiment.keywords,
        ...redditSentiment.keywords,
        ...newsSentiment.keywords
      ];
      
      // Agregar palavras-chave por frequência e sentimento
      const keywordMap = new Map<string, { word: string; frequency: number; sentiment: number }>();
      
      allKeywords.forEach(kw => {
        const frequency = kw.frequency || 1; // Se não houver frequência, assume 1
        
        if (keywordMap.has(kw.word)) {
          const existing = keywordMap.get(kw.word)!;
          keywordMap.set(kw.word, {
            word: kw.word,
            frequency: existing.frequency + frequency,
            sentiment: (existing.sentiment * existing.frequency + kw.sentiment * frequency) / 
                      (existing.frequency + frequency)
          });
        } else {
          keywordMap.set(kw.word, {
            word: kw.word,
            frequency: frequency,
            sentiment: kw.sentiment
          });
        }
      });
      
      // Ordenar palavras-chave por frequência
      const keywords = Array.from(keywordMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10); // Top 10 palavras-chave
      
      const result: SentimentResult = {
        symbol: symbol.toUpperCase(),
        overallSentiment,
        sentimentScore: weightedScore,
        sources: {
          twitter: twitterSentiment.score,
          reddit: redditSentiment.score,
          news: newsSentiment.score
        },
        confidence,
        timestamp: new Date().toISOString(),
        keywords
      };
      
      logger.info(`Análise de sentimento para ${symbol} concluída: ${overallSentiment} (${weightedScore.toFixed(2)})`);
      
      return result;
    } catch (error) {
      logger.error(`Erro ao analisar sentimento para ${symbol}:`, error);
      throw error;
    }
  }, SENTIMENT_CACHE_TTL);
}

/**
 * Busca dados do Twitter para uma criptomoeda
 * Em produção, usaria a API do Twitter (agora X)
 */
async function fetchTwitterData(symbol: string): Promise<string[]> {
  // Simulação de tweets para desenvolvimento
  // Em produção, conectaríamos à API do Twitter
  
  const sampleTweets = [
    `${symbol} está pronto para disparar! Os indicadores técnicos estão muito bullish. #crypto #toTheMoon`,
    `Acabei de comprar mais ${symbol}. Acho que estamos no início de um bull run.`,
    `Cuidado com ${symbol}, o mercado parece estar sobrecomprado. Pode haver uma correção em breve.`,
    `${symbol} acaba de anunciar uma parceria importante. Isso é muito positivo para o futuro!`,
    `O projeto ${symbol} continua entregando. Roadmap sendo cumprido. Muito otimista.`
  ];
  
  // Selecionar 3 tweets aleatórios da amostra para simular a busca
  const selectedTweets = [];
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * sampleTweets.length);
    selectedTweets.push(sampleTweets[randomIndex]);
  }
  
  return selectedTweets;
}

/**
 * Busca dados do Reddit para uma criptomoeda
 * Em produção, usaria a API do Reddit
 */
async function fetchRedditData(symbol: string): Promise<string[]> {
  // Simulação de posts do Reddit para desenvolvimento
  // Em produção, conectaríamos à API do Reddit
  
  const samplePosts = [
    `Análise técnica de ${symbol}: Estamos vendo uma formação de bandeira no gráfico diário, o que geralmente é um sinal bullish após uma tendência de alta. Acredito que podemos ver um novo ATH em breve.`,
    `Experiência com staking de ${symbol}: Tenho feito stake de ${symbol} por 6 meses e o retorno tem sido incrível. Alguém mais está fazendo isso?`,
    `Cuidado com ${symbol} agora: os dados on-chain mostram que grandes holders estão vendendo. Isso pode indicar uma queda próxima.`,
    `${symbol} vs outras altcoins: Por que ${symbol} é tecnicamente superior e vai sobreviver ao bear market.`,
    `Acabei de vender todo meu ${symbol}. O projeto não está entregando o que prometeu. Muitos atrasos no desenvolvimento.`
  ];
  
  // Selecionar 2 posts aleatórios da amostra para simular a busca
  const selectedPosts = [];
  for (let i = 0; i < 2; i++) {
    const randomIndex = Math.floor(Math.random() * samplePosts.length);
    selectedPosts.push(samplePosts[randomIndex]);
  }
  
  return selectedPosts;
}

/**
 * Busca notícias para uma criptomoeda
 * Em produção, usaria APIs como News API, CryptoCompare News, etc.
 */
async function fetchNewsData(symbol: string): Promise<string[]> {
  // Simulação de manchetes de notícias para desenvolvimento
  // Em produção, conectaríamos a uma API de notícias
  
  const sampleNews = [
    `${symbol} se prepara para grande atualização na rede que promete melhorar escalabilidade`,
    `Reguladores aprovam ETF de ${symbol} em importante mercado asiático`,
    `Analistas preveem valorização de ${symbol} com adoção institucional crescente`,
    `${symbol} enfrenta problemas técnicos após ataque de hackers; preço despenca`,
    `CEO de grande empresa anuncia investimento massivo em ${symbol}: "É o futuro dos pagamentos"`
  ];
  
  // Selecionar 1 notícia aleatória da amostra para simular a busca
  const randomIndex = Math.floor(Math.random() * sampleNews.length);
  return [sampleNews[randomIndex]];
}

/**
 * Analisa o sentimento de uma fonte específica usando Ollama
 */
async function analyzeSourceSentiment(
  texts: string[],
  source: 'twitter' | 'reddit' | 'news',
  symbol: string
): Promise<{
  score: number;
  keywords: Array<{ word: string; frequency: number; sentiment: number }>;
}> {
  try {
    if (texts.length === 0) {
      return { score: 0, keywords: [] };
    }
    
    // Combinar todos os textos em um único para análise
    // Em produção, analisaríamos cada texto individualmente para maior precisão
    const combinedText = texts.join("\n\n");
    
    // Usar Ollama para análise de sentimento
    const contextText = `Textos de ${source} sobre a criptomoeda ${symbol}:\n${combinedText}`;
    const sentimentAnalysis = await ollamaService.analyzeSentiment(contextText);
    
    // Converter o formato de keywords do Ollama para nosso formato
    const keywords = sentimentAnalysis.keywords.map(kw => ({
      word: kw.word,
      frequency: 1, // Frequência será agregada posteriormente
      sentiment: kw.sentiment
    }));
    
    return {
      score: sentimentAnalysis.score,
      keywords
    };
  } catch (error) {
    logger.error(`Erro ao analisar sentimento de ${source} para ${symbol}:`, error);
    
    // Fallback para valores simulados em caso de erro
    return {
      score: Math.min(Math.max(Math.random() * 2 - 1, -1), 1),
      keywords: []
    };
  }
}

/**
 * Combina sentimento com análise técnica para gerar uma recomendação
 */
export async function getMarketSentimentSummary(
  symbol: string
): Promise<{
  symbol: string;
  sentimentScore: number;
  technicalScore: number; // -1 a 1
  overallRecommendation: 'comprar' | 'vender' | 'manter';
  confidence: number;
  reasonSummary: string;
}> {
  try {
    // Obter análise de sentimento
    const sentiment = await analyzeSentiment(symbol);
    
    // Simular score técnico (em produção, viria da análise técnica real)
    const technicalScore = Math.min(Math.max(Math.random() * 2 - 1, -1), 1);
    
    // Combinar scores (50% sentimento, 50% técnico)
    const combinedScore = (sentiment.sentimentScore + technicalScore) / 2;
    
    // Determinar recomendação
    let recommendation: 'comprar' | 'vender' | 'manter';
    if (combinedScore > 0.3) {
      recommendation = 'comprar';
    } else if (combinedScore < -0.3) {
      recommendation = 'vender';
    } else {
      recommendation = 'manter';
    }
    
    // Confiança baseada na confiança do sentimento e na concordância entre técnico e sentimento
    const agreementFactor = 1 - Math.abs(sentiment.sentimentScore - technicalScore) / 2;
    const confidence = (sentiment.confidence * 0.7 + agreementFactor * 30) * 0.9;
    
    // Gerar resumo da razão
    let reasonSummary = '';
    if (sentiment.sentimentScore > 0.3 && technicalScore > 0.3) {
      reasonSummary = 'Indicadores técnicos e sentimento do mercado fortemente positivos.';
    } else if (sentiment.sentimentScore < -0.3 && technicalScore < -0.3) {
      reasonSummary = 'Indicadores técnicos e sentimento do mercado fortemente negativos.';
    } else if (sentiment.sentimentScore > 0.3) {
      reasonSummary = 'Sentimento do mercado positivo, apesar de indicadores técnicos mistos.';
    } else if (technicalScore > 0.3) {
      reasonSummary = 'Indicadores técnicos positivos, apesar de sentimento de mercado misto.';
    } else if (sentiment.sentimentScore < -0.3) {
      reasonSummary = 'Sentimento do mercado negativo, apesar de indicadores técnicos mistos.';
    } else if (technicalScore < -0.3) {
      reasonSummary = 'Indicadores técnicos negativos, apesar de sentimento de mercado misto.';
    } else {
      reasonSummary = 'Tanto indicadores técnicos quanto sentimento do mercado apresentam sinais mistos.';
    }
    
    return {
      symbol: symbol.toUpperCase(),
      sentimentScore: sentiment.sentimentScore,
      technicalScore,
      overallRecommendation: recommendation,
      confidence,
      reasonSummary
    };
  } catch (error) {
    logger.error(`Erro ao gerar resumo de sentimento de mercado para ${symbol}:`, error);
    throw error;
  }
} 