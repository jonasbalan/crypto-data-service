import { Router } from 'express';
import { getSentimentAnalysis, getSentimentSummary, getTrendingBysentiment } from '../controllers/sentimentController';
import { validateSymbol } from '../middleware/validationMiddleware';

const router = Router();

/**
 * Rotas para análise de sentimento
 */

// Obter análise de sentimento para uma criptomoeda
router.get('/:symbol', validateSymbol, getSentimentAnalysis);

// Obter resumo com recomendação para uma criptomoeda
router.get('/:symbol/summary', validateSymbol, getSentimentSummary);

// Obter criptomoedas em tendência com base na análise de sentimento
router.get('/trending', getTrendingBysentiment);

export default router; 