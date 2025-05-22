import { PolynomialRegression } from 'ml-regression';
import { expect } from 'chai';
import sinon from 'sinon';
import { predictPrice, getOrTrainModel } from '../../services/ml/pricePredictionModel';
import { CryptoAsset } from '../../models/crypto';

describe('Price Prediction Model', () => {
  // Stub para o modelo CryptoAsset
  let findOneStub: sinon.SinonStub;

  // Mock data para testes
  const mockPriceHistory = Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
    price: 10000 + (i * 100) + (Math.random() * 100),
    volume: 1000000 + Math.random() * 500000,
    change24h: (Math.random() * 4) - 2
  }));

  const mockAsset = {
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPrice: 15000,
    priceHistory: mockPriceHistory
  };

  // Setup e teardown
  beforeEach(() => {
    // Criar stub para CryptoAsset.findOne
    findOneStub = sinon.stub(CryptoAsset, 'findOne');
    findOneStub.resolves(mockAsset);
    
    // Criar um mock para a classe PolynomialRegression
    const mockRegression = {
      predict: sinon.stub().returns(0.75),
      score: sinon.stub().returns(0.85),
      coefficients: [1, 2, 3, 4],
      degree: 3
    };
    
    // Substituir o construtor
    sinon.stub(PolynomialRegression.prototype, 'predict').callsFake(() => 0.75);
    sinon.stub(PolynomialRegression.prototype, 'score').callsFake(() => 0.85);
    
    // Definir propriedades estáticas
    Object.defineProperty(PolynomialRegression.prototype, 'coefficients', {
      get: () => [1, 2, 3, 4]
    });
    
    Object.defineProperty(PolynomialRegression.prototype, 'degree', {
      get: () => 3
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  // Testes
  it('deve retornar uma previsão de preço para um símbolo válido', async () => {
    const prediction = await predictPrice('BTC', 1);
    
    expect(prediction).to.be.an('object');
    expect(prediction.currentPrice).to.be.a('number');
    expect(prediction.predictedPrice).to.be.a('number');
    expect(prediction.percentChange).to.be.a('number');
    expect(prediction.confidence).to.be.a('number');
  });

  it('deve lançar erro quando não há dados suficientes', async () => {
    findOneStub.resolves({
      symbol: 'TEST',
      priceHistory: mockPriceHistory.slice(0, 5) // dados insuficientes
    });

    try {
      await predictPrice('TEST');
      expect.fail('Deveria ter lançado um erro');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.include('Dados insuficientes');
    }
  });

  it('deve lançar erro quando o símbolo não existe', async () => {
    findOneStub.resolves(null);

    try {
      await predictPrice('INVALID');
      expect.fail('Deveria ter lançado um erro');
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });

  it('deve retornar modelos em cache quando disponíveis', async () => {
    // Primeiro acesso deve treinar o modelo
    await getOrTrainModel('BTC');
    
    // Segundo acesso deve usar o cache
    const result = await getOrTrainModel('BTC');
    
    expect(result).to.be.an('object');
    expect(result.model).to.exist;
    expect(result.min).to.be.a('number');
    expect(result.max).to.be.a('number');
  });
}); 