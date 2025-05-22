import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { 
  predictPrice, 
  getOrTrainModel, 
  saveModel,
  loadModel
} from '../../services/ml/pricePredictionModel';
import { CryptoAsset } from '../../models/crypto';

// Criar router
const router: Router = express.Router();

/**
 * @route GET /api/prediction/price/:symbol
 * @description Prevê preço futuro para um símbolo
 */
router.get('/price/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days as string) || 1;
    
    // Validar dias (entre 1 e 30)
    if (isNaN(days) || days < 1 || days > 30) {
      return res.status(400).json({ 
        error: 'Número de dias inválido. Use um valor entre 1 e 30.' 
      });
    }
    
    // Verificar se o ativo existe
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset) {
      return res.status(404).json({ error: `Ativo não encontrado: ${symbol}` });
    }
    
    // Tentar fazer previsão
    try {
      const prediction = await predictPrice(symbol, days);
      
      return res.status(200).json({
        symbol: symbol.toUpperCase(),
        prediction,
        metadata: {
          days,
          timestamp: new Date().toISOString()
        }
      });
    } catch (predError: any) {
      // Se for erro de dados insuficientes, retornar 400
      if (predError.message && predError.message.includes('insuficientes')) {
        return res.status(400).json({ 
          error: predError.message,
          recommendation: 'Aguarde até que mais dados históricos estejam disponíveis.'
        });
      }
      
      // Outro erro, propagar
      throw predError;
    }
  } catch (error: any) {
    logger.error(`Erro ao prever preço para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao prever preço' });
  }
});

/**
 * @route POST /api/prediction/train/:symbol
 * @description Treina ou retreina um modelo para um símbolo
 */
router.post('/train/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    
    // Verificar API key (em produção, você teria middleware de autenticação)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'API key inválida ou ausente' });
    }
    
    // Verificar se o ativo existe
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset) {
      return res.status(404).json({ error: `Ativo não encontrado: ${symbol}` });
    }
    
    // Iniciar treinamento em background
    getOrTrainModel(symbol, '24h')
      .then(async (result) => {
        logger.info(`Modelo para ${symbol} treinado com sucesso`);
        
        // Salvar modelo
        try {
          await saveModel(symbol, '24h');
        } catch (saveError) {
          logger.error(`Erro ao salvar modelo para ${symbol}:`, saveError);
        }
      })
      .catch(error => logger.error(`Erro ao treinar modelo para ${symbol}:`, error));
    
    return res.status(202).json({ 
      message: `Treinamento iniciado para ${symbol}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Erro ao iniciar treinamento para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao iniciar treinamento' });
  }
});

/**
 * @route GET /api/prediction/batch
 * @description Obtém previsões para vários símbolos
 */
router.get('/batch', async (req: Request, res: Response): Promise<Response> => {
  try {
    const symbolsParam = req.query.symbols as string;
    
    if (!symbolsParam) {
      return res.status(400).json({ error: 'Parâmetro "symbols" obrigatório' });
    }
    
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    const days = parseInt(req.query.days as string) || 1;
    
    // Validar dias
    if (isNaN(days) || days < 1 || days > 30) {
      return res.status(400).json({ 
        error: 'Número de dias inválido. Use um valor entre 1 e 30.' 
      });
    }
    
    // Validar quantidade de símbolos
    if (symbols.length > 10) {
      return res.status(400).json({ 
        error: 'Limite de 10 símbolos por requisição' 
      });
    }
    
    // Fazer previsões em paralelo
    const predictionPromises = symbols.map(async (symbol) => {
      try {
        const prediction = await predictPrice(symbol, days);
        return {
          symbol,
          status: 'success',
          prediction
        };
      } catch (error: any) {
        return {
          symbol,
          status: 'error',
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(predictionPromises);
    
    return res.status(200).json({
      results,
      metadata: {
        days,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Erro ao processar previsões em lote:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar previsões em lote' });
  }
});

/**
 * @route POST /api/prediction/save/:symbol
 * @description Salva um modelo treinado
 */
router.post('/save/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    
    // Verificar API key (em produção, você teria middleware de autenticação)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'API key inválida ou ausente' });
    }
    
    const success = await saveModel(symbol);
    
    if (success) {
      return res.status(200).json({ 
        message: `Modelo para ${symbol} salvo com sucesso`,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ 
        error: `Não foi possível salvar o modelo para ${symbol}` 
      });
    }
  } catch (error: any) {
    logger.error(`Erro ao salvar modelo para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar modelo' });
  }
});

/**
 * @route POST /api/prediction/load/:symbol
 * @description Carrega um modelo previamente salvo
 */
router.post('/load/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    
    // Verificar API key (em produção, você teria middleware de autenticação)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'API key inválida ou ausente' });
    }
    
    const success = await loadModel(symbol);
    
    if (success) {
      return res.status(200).json({ 
        message: `Modelo para ${symbol} carregado com sucesso`,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ 
        error: `Não foi possível carregar o modelo para ${symbol}` 
      });
    }
  } catch (error: any) {
    logger.error(`Erro ao carregar modelo para ${req.params.symbol}:`, error);
    return res.status(500).json({ error: error.message || 'Erro ao carregar modelo' });
  }
});

export default router; 