import { expect } from 'chai';
import sinon from 'sinon';
import { analyzeSentiment, getMarketSentimentSummary } from '../../services/ml/sentimentAnalysis';
import { ollamaService } from '../../services/ollamaService';
import * as cacheService from '../../services/cache/cacheService';

// Acessar funções privadas para teste
// Necessário usar require para acessar funções não exportadas
const sentimentModule = require('../../services/ml/sentimentAnalysis');
const {
  fetchTwitterData,
  fetchRedditData,
  fetchNewsData,
  analyzeSourceSentiment
} = sentimentModule;

describe('Análise de Sentimento do Mercado Crypto', () => {
  // Setup para os testes
  beforeEach(() => {
    // Stub para ollamaService.analyzeSentiment com diferentes respostas baseadas no conteúdo
    const analyzeSentimentStub = sinon.stub(ollamaService, 'analyzeSentiment');
    
    // Resposta padrão positiva
    analyzeSentimentStub.resolves({
      sentiment: 'bullish',
      score: 0.6,
      keywords: [
        { word: 'positivo', sentiment: 0.8 },
        { word: 'crescimento', sentiment: 0.7 },
        { word: 'bullish', sentiment: 0.9 }
      ]
    });
    
    // Resposta específica para textos negativos
    analyzeSentimentStub.withArgs(sinon.match(/queda|bearish|negativo/)).resolves({
      sentiment: 'bearish',
      score: -0.7,
      keywords: [
        { word: 'queda', sentiment: -0.8 },
        { word: 'risco', sentiment: -0.6 },
        { word: 'bearish', sentiment: -0.9 }
      ]
    });
    
    // Resposta neutra para textos mistos
    analyzeSentimentStub.withArgs(sinon.match(/neutro|mixed|misto/)).resolves({
      sentiment: 'neutral',
      score: 0.1,
      keywords: [
        { word: 'mercado', sentiment: 0.2 },
        { word: 'volatilidade', sentiment: -0.3 },
        { word: 'análise', sentiment: 0.1 }
      ]
    });
    
    // Stub para o cache
    sinon.stub(cacheService, 'cachedResult').callsFake((key, fn) => fn());
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Funções de coleta de dados', () => {
    it('deve buscar dados do Twitter corretamente', async () => {
      const tweets = await fetchTwitterData('BTC');
      
      expect(tweets).to.be.an('array');
      expect(tweets.length).to.equal(3); // Verificar quantidade correta
      expect(tweets[0]).to.be.a('string');
      expect(tweets[0]).to.include('BTC'); // Tweets devem incluir o símbolo
    });
    
    it('deve buscar dados do Reddit corretamente', async () => {
      const posts = await fetchRedditData('ETH');
      
      expect(posts).to.be.an('array');
      expect(posts.length).to.equal(2); // Verificar quantidade correta
      expect(posts[0]).to.be.a('string');
      expect(posts[0]).to.include('ETH'); // Posts devem incluir o símbolo
    });
    
    it('deve buscar dados de notícias corretamente', async () => {
      const news = await fetchNewsData('XRP');
      
      expect(news).to.be.an('array');
      expect(news.length).to.equal(1); // Verificar quantidade correta
      expect(news[0]).to.be.a('string');
      expect(news[0]).to.include('XRP'); // Notícias devem incluir o símbolo
    });
  });
  
  describe('Análise de sentimento por fonte', () => {
    it('deve analisar sentimento de tweets corretamente', async () => {
      const tweetData = [
        'BTC está pronto para disparar! Os indicadores técnicos estão muito bullish. #crypto #toTheMoon',
        'Acabei de comprar mais BTC. Acho que estamos no início de um bull run.'
      ];
      
      const result = await analyzeSourceSentiment(tweetData, 'twitter', 'BTC');
      
      expect(result.score).to.be.a('number');
      expect(result.score).to.be.within(-1, 1);
      expect(result.keywords).to.be.an('array');
      expect(result.keywords[0]).to.have.keys(['word', 'frequency', 'sentiment']);
    });
    
    it('deve retornar sentimento neutro para dados vazios', async () => {
      const result = await analyzeSourceSentiment([], 'reddit', 'SOL');
      
      expect(result.score).to.equal(0);
      expect(result.keywords).to.be.an('array').that.is.empty;
    });
    
    it('deve usar fallback quando o Ollama falha', async () => {
      // Forçar um erro no Ollama
      (ollamaService.analyzeSentiment as sinon.SinonStub).rejects(new Error('Erro de conexão'));
      
      const newsData = ['XRP enfrenta problemas técnicos após ataque de hackers; preço despenca'];
      const result = await analyzeSourceSentiment(newsData, 'news', 'XRP');
      
      // Ainda deve retornar um resultado válido usando o fallback
      expect(result.score).to.be.a('number');
      expect(result.score).to.be.within(-1, 1);
    });
    
    it('deve analisar corretamente sentimento negativo', async () => {
      const bearishNews = ['BTC despenca 15% após reguladores rejeitarem ETF; investidores em pânico'];
      
      // Configurar stub para resposta negativa
      (ollamaService.analyzeSentiment as sinon.SinonStub)
        .withArgs(sinon.match(/despenca.*pânico/))
        .resolves({
          sentiment: 'bearish',
          score: -0.9,
          keywords: [
            { word: 'despenca', sentiment: -0.9 },
            { word: 'pânico', sentiment: -0.95 }
          ]
        });
      
      const result = await analyzeSourceSentiment(bearishNews, 'news', 'BTC');
      
      expect(result.score).to.be.below(0);
      expect(result.keywords.some(k => k.sentiment < 0)).to.be.true;
    });
  });

  describe('Análise de sentimento agregada', () => {
    it('deve retornar uma análise de sentimento válida para um símbolo', async () => {
      const result = await analyzeSentiment('BTC');
      
      expect(result).to.be.an('object');
      expect(result.symbol).to.equal('BTC');
      expect(result.overallSentiment).to.be.oneOf(['bullish', 'bearish', 'neutral']);
      expect(result.sentimentScore).to.be.a('number');
      expect(result.sentimentScore).to.be.within(-1, 1);
      expect(result.sources).to.have.keys(['twitter', 'reddit', 'news']);
      expect(result.confidence).to.be.a('number');
      expect(result.confidence).to.be.within(0, 100);
      expect(result.keywords).to.be.an('array');
      expect(result.keywords.length).to.be.greaterThan(0);
      expect(result.keywords[0]).to.have.keys(['word', 'frequency', 'sentiment']);
    });

    it('deve combinar sentimentos de diferentes fontes corretamente', async () => {
      // Configurar stubs para as funções de busca
      sinon.stub(sentimentModule, 'fetchTwitterData').resolves([
        'BTC está pronto para disparar! Os indicadores técnicos estão muito bullish.'
      ]);
      
      sinon.stub(sentimentModule, 'fetchRedditData').resolves([
        'Cuidado com BTC agora: os dados on-chain mostram que grandes holders estão vendendo.'
      ]);
      
      sinon.stub(sentimentModule, 'fetchNewsData').resolves([
        'BTC se mantém estável apesar da volatilidade do mercado.'
      ]);
      
      // Configurar stubs para o Ollama
      (ollamaService.analyzeSentiment as sinon.SinonStub)
        .withArgs(sinon.match(/indicadores técnicos.*bullish/))
        .resolves({
          sentiment: 'bullish',
          score: 0.8,
          keywords: [{ word: 'bullish', sentiment: 0.9 }]
        });
      
      (ollamaService.analyzeSentiment as sinon.SinonStub)
        .withArgs(sinon.match(/Cuidado.*vendendo/))
        .resolves({
          sentiment: 'bearish',
          score: -0.7,
          keywords: [{ word: 'vendendo', sentiment: -0.8 }]
        });
      
      (ollamaService.analyzeSentiment as sinon.SinonStub)
        .withArgs(sinon.match(/estável.*volatilidade/))
        .resolves({
          sentiment: 'neutral',
          score: 0.1,
          keywords: [{ word: 'estável', sentiment: 0.2 }]
        });
      
      const result = await analyzeSentiment('BTC');
      
      // Verificar que os scores foram ponderados corretamente
      // Twitter (0.8 * 0.4) + Reddit (-0.7 * 0.3) + News (0.1 * 0.3) = 0.32 - 0.21 + 0.03 = 0.14
      expect(result.sentimentScore).to.be.closeTo(0.14, 0.1);
      expect(result.sources.twitter).to.be.closeTo(0.8, 0.1);
      expect(result.sources.reddit).to.be.closeTo(-0.7, 0.1);
      expect(result.sources.news).to.be.closeTo(0.1, 0.1);
    });
    
    it('deve agregar palavras-chave corretamente', async () => {
      // Configurar stubs para as funções de busca (simplificado)
      sinon.stub(sentimentModule, 'fetchTwitterData').resolves(['Texto de exemplo']);
      sinon.stub(sentimentModule, 'fetchRedditData').resolves(['Texto de exemplo']);
      sinon.stub(sentimentModule, 'fetchNewsData').resolves(['Texto de exemplo']);
      
      // Configurar stubs para o Ollama com palavras-chave repetidas
      const sentimentResponse = {
        sentiment: 'bullish',
        score: 0.5,
        keywords: [
          { word: 'bitcoin', sentiment: 0.7 },
          { word: 'crescimento', sentiment: 0.8 }
        ]
      };
      
      (ollamaService.analyzeSentiment as sinon.SinonStub).resolves(sentimentResponse);
      
      const result = await analyzeSentiment('BTC');
      
      // Verificar agregação de palavras-chave (frequência e sentiment médio)
      const bitcoinKeyword = result.keywords.find(k => k.word === 'bitcoin');
      expect(bitcoinKeyword).to.exist;
      expect(bitcoinKeyword?.frequency).to.be.greaterThan(1); // A palavra deve aparecer mais de uma vez
      expect(bitcoinKeyword?.sentiment).to.equal(0.7); // O sentimento deve ser preservado
    });
  });

  describe('Resumo e recomendações', () => {
    it('deve gerar um resumo de mercado válido', async () => {
      const result = await getMarketSentimentSummary('ETH');
      
      expect(result).to.be.an('object');
      expect(result.symbol).to.equal('ETH');
      expect(result.sentimentScore).to.be.a('number');
      expect(result.technicalScore).to.be.a('number');
      expect(result.overallRecommendation).to.be.oneOf(['comprar', 'vender', 'manter']);
      expect(result.confidence).to.be.a('number');
      expect(result.reasonSummary).to.be.a('string');
    });

    it('deve recomendar compra quando sentimento e técnico são positivos', async () => {
      // Stub para análise de sentimento
      sinon.stub(sentimentModule, 'analyzeSentiment').resolves({
        symbol: 'ETH',
        overallSentiment: 'bullish',
        sentimentScore: 0.8,
        sources: { twitter: 0.8, reddit: 0.7, news: 0.9 },
        confidence: 85,
        keywords: [],
        timestamp: new Date().toISOString()
      });
      
      // Forçar random para retornar um valor técnico positivo
      const originalRandom = Math.random;
      Math.random = () => 0.9; // Forçar um valor que resulte em score positivo
      
      const result = await getMarketSentimentSummary('ETH');
      
      // Restaurar Math.random
      Math.random = originalRandom;
      
      expect(result.overallRecommendation).to.equal('comprar');
      expect(result.reasonSummary).to.include('positivos');
      expect(result.confidence).to.be.greaterThan(80); // Alta confiança quando sentimento e técnico concordam
    });

    it('deve recomendar venda quando sentimento e técnico são negativos', async () => {
      // Stub para análise de sentimento
      sinon.stub(sentimentModule, 'analyzeSentiment').resolves({
        symbol: 'ETH',
        overallSentiment: 'bearish',
        sentimentScore: -0.7,
        sources: { twitter: -0.7, reddit: -0.8, news: -0.6 },
        confidence: 80,
        keywords: [],
        timestamp: new Date().toISOString()
      });
      
      // Forçar random para retornar um valor técnico negativo
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Forçar um valor que resulte em score negativo
      
      const result = await getMarketSentimentSummary('ETH');
      
      // Restaurar Math.random
      Math.random = originalRandom;
      
      expect(result.overallRecommendation).to.equal('vender');
      expect(result.reasonSummary).to.include('negativos');
    });
    
    it('deve recomendar manter quando sentimento e técnico são neutros', async () => {
      // Stub para análise de sentimento
      sinon.stub(sentimentModule, 'analyzeSentiment').resolves({
        symbol: 'ETH',
        overallSentiment: 'neutral',
        sentimentScore: 0.1,
        sources: { twitter: 0.2, reddit: -0.1, news: 0.1 },
        confidence: 60,
        keywords: [],
        timestamp: new Date().toISOString()
      });
      
      // Forçar random para retornar um valor técnico neutro
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Forçar um valor que resulte em score neutro
      
      const result = await getMarketSentimentSummary('ETH');
      
      // Restaurar Math.random
      Math.random = originalRandom;
      
      expect(result.overallRecommendation).to.equal('manter');
      expect(result.reasonSummary).to.include('mistos');
    });
    
    it('deve ter menor confiança quando sentimento e técnico divergem', async () => {
      // Stub para análise de sentimento positivo
      sinon.stub(sentimentModule, 'analyzeSentiment').resolves({
        symbol: 'ETH',
        overallSentiment: 'bullish',
        sentimentScore: 0.7,
        sources: { twitter: 0.7, reddit: 0.8, news: 0.6 },
        confidence: 80,
        keywords: [],
        timestamp: new Date().toISOString()
      });
      
      // Forçar random para retornar um valor técnico negativo
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Forçar um valor que resulte em score negativo
      
      const result = await getMarketSentimentSummary('ETH');
      
      // Restaurar Math.random
      Math.random = originalRandom;
      
      // A confiança deve ser menor quando os indicadores divergem
      expect(result.confidence).to.be.lessThan(80);
    });
  });
  
  describe('Cenários de erro e cache', () => {
    it('deve usar o cache para requisições repetidas', async () => {
      // Restaurar o stub do cache para testar o cache real
      (cacheService.cachedResult as sinon.SinonStub).restore();
      
      // Spy no método do Ollama para contar chamadas
      const analyzeSentimentSpy = sinon.spy(ollamaService, 'analyzeSentiment');
      
      // Primeira chamada para encher o cache
      const firstResult = await analyzeSentiment('ETH');
      
      // Limpar o spy
      analyzeSentimentSpy.resetHistory();
      
      // Segunda chamada deve usar o cache
      const secondResult = await analyzeSentiment('ETH');
      
      // Os resultados devem ser idênticos porque estamos usando o cache
      expect(secondResult).to.deep.equal(firstResult);
      
      // Ollama não deve ser chamado na segunda vez
      expect(analyzeSentimentSpy.callCount).to.equal(0);
    });
    
    it('deve lidar com erros na análise de sentimento', async () => {
      // Simular erro na função de análise
      sinon.stub(sentimentModule, 'analyzeSourceSentiment').rejects(new Error('Falha na análise'));
      
      try {
        await analyzeSentiment('BTC');
        expect.fail('Deveria ter lançado um erro');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('Erro ao analisar sentimento');
      }
    });
    
    it('deve lidar com erros na geração de resumo', async () => {
      // Simular erro na função de análise
      sinon.stub(sentimentModule, 'analyzeSentiment').rejects(new Error('Falha na análise'));
      
      try {
        await getMarketSentimentSummary('BTC');
        expect.fail('Deveria ter lançado um erro');
      } catch (error: any) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('Erro ao gerar resumo');
      }
    });
  });
}); 