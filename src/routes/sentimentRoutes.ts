import { Router } from 'express';
import { getSentimentAnalysis, getSentimentSummary, getTrendingBysentiment } from '../controllers/sentimentController';
import { validateSymbol } from '../middleware/validationMiddleware';

const router = Router();

/**
 * Rotas para análise de sentimento
 */

// Obter criptomoedas em tendência com base na análise de sentimento
router.get('/trending', getTrendingBysentiment);

// Obter resumo com recomendação para uma criptomoeda (deve vir antes da rota genérica)
router.get('/:symbol/summary', validateSymbol, getSentimentSummary);

// Obter análise de sentimento para uma criptomoeda
router.get('/:symbol', validateSymbol, getSentimentAnalysis);

export default router; 