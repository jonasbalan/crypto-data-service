import { Router } from 'express';
import { vectorController } from '../controllers/vectorController';
import { validateVectorData } from '../middleware/vectorValidation';

const router = Router();

/**
 * @swagger
 * /api/vectors/process:
 *   post:
 *     summary: Processa dados do mercado e os vetoriza
 *     tags: [Vetores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MarketData'
 *     responses:
 *       201:
 *         description: Dados processados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/process', validateVectorData, vectorController.processData.bind(vectorController));

/**
 * @swagger
 * /api/vectors/search:
 *   post:
 *     summary: Busca vetores similares
 *     tags: [Vetores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vector
 *             properties:
 *               vector:
 *                 $ref: '#/components/schemas/Vector'
 *               limit:
 *                 type: integer
 *                 default: 10
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Resultados da busca
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   distance:
 *                     type: number
 *                   metadata:
 *                     $ref: '#/components/schemas/MarketData'
 *       400:
 *         description: Vetor inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/search', validateVectorData, vectorController.searchVectors.bind(vectorController));

/**
 * @swagger
 * /api/vectors/stats:
 *   get:
 *     summary: Obtém estatísticas da coleção de vetores
 *     tags: [Vetores]
 *     responses:
 *       200:
 *         description: Estatísticas da coleção
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VectorStats'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', vectorController.getVectorStats.bind(vectorController));

export default router; 