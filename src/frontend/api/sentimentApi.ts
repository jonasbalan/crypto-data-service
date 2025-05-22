import axios from 'axios';

// Definição de tipos para as respostas da API
export interface SentimentResult {
  symbol: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  sources: {
    twitter: number;
    reddit: number;
    news: number;
  };
  confidence: number;
  keywords: {
    word: string;
    frequency: number;
    sentiment: number;
  }[];
  timestamp: string;
}

export interface SentimentSummary {
  symbol: string;
  sentimentScore: number;
  technicalScore: number;
  overallRecommendation: 'comprar' | 'vender' | 'manter';
  confidence: number;
  reasonSummary: string;
  timestamp: string;
}

// Cliente Axios configurado
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Funções para acessar a API de sentimento
export const sentimentApi = {
  // Obter análise de sentimento para uma criptomoeda
  getAnalysis: async (symbol: string): Promise<SentimentResult> => {
    try {
      const response = await api.get<SentimentResult>(`/sentiment/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar análise de sentimento:', error);
      throw error;
    }
  },

  // Obter resumo com recomendação para uma criptomoeda
  getSummary: async (symbol: string): Promise<SentimentSummary> => {
    try {
      const response = await api.get<SentimentSummary>(`/sentiment/${symbol}/summary`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo de sentimento:', error);
      throw error;
    }
  },

  // Obter criptomoedas em tendência com base na análise de sentimento
  getTrending: async (): Promise<string[]> => {
    try {
      const response = await api.get<string[]>('/sentiment/trending');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar criptomoedas em tendência:', error);
      throw error;
    }
  }
}; 