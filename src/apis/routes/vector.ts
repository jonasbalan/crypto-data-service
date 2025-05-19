import express, { Request, Response, Router } from 'express';
import { logger } from '../../utils/logger';
import { 
  generateAssetEmbedding, 
  querySimilarVectors, 
  createDataEmbedding,
  updateAllAssetEmbeddings
} from '../../services/vector/embedding';
import { CryptoAsset } from '../../models/crypto';
import { getMilvusClient } from '../../database/init';

// Criar router
const router: Router = express.Router();

// Tipos de dados válidos
const VALID_DATA_TYPES = ['price', 'social', 'technical', 'transaction', 'asset'] as const;
type DataType = typeof VALID_DATA_TYPES[number];

// Interface para filtros de consulta
interface QueryFilters {
  type?: DataType;
  startDate?: string;
  endDate?: string;
  minScore?: number;
  symbol?: string;
  source?: string;
  [key: string]: any;
}

// Interface para resultado de consulta
interface QueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Valida e formata os filtros da consulta
 */
function validateAndFormatFilters(filters: any): QueryFilters {
  const formattedFilters: QueryFilters = {};
  
  if (filters.type && VALID_DATA_TYPES.includes(filters.type as DataType)) {
    formattedFilters.type = filters.type as DataType;
  }
  
  if (filters.startDate) {
    formattedFilters.timestamp = {
      $gte: new Date(filters.startDate).toISOString()
    };
  }
  
  if (filters.endDate) {
    formattedFilters.timestamp = {
      ...formattedFilters.timestamp,
      $lte: new Date(filters.endDate).toISOString()
    };
  }
  
  if (filters.minScore && !isNaN(Number(filters.minScore))) {
    formattedFilters.minScore = Number(filters.minScore);
  }
  
  if (filters.symbol) {
    formattedFilters.symbol = filters.symbol.toUpperCase();
  }
  
  if (filters.source) {
    formattedFilters.source = filters.source;
  }
  
  return formattedFilters;
}

/**
 * @route POST /api/vector/generate
 * @description Gera embeddings para todos os ativos
 */
router.post('/generate', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Verificar autenticação (em produção, você teria middleware de autenticação)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'API key inválida ou ausente' });
    }
    
    // Iniciar processo de geração de embeddings em background
    updateAllAssetEmbeddings()
      .then(() => logger.info('Geração de embeddings concluída com sucesso'))
      .catch(error => logger.error('Erro na geração de embeddings:', error));
    
    // Responder imediatamente, já que o processo pode demorar
    return res.status(202).json({ 
      message: 'Geração de embeddings iniciada em background',
      status: 'processing'
    });
  } catch (error) {
    logger.error('Erro ao iniciar geração de embeddings:', error);
    return res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

/**
 * @route POST /api/vector/query
 * @description Realiza consulta semântica no banco de dados vetorial
 */
router.post('/query', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Obter parâmetros da requisição
    const { query, filters = {}, topK = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Consulta não fornecida' });
    }
    
    // Validar e formatar filtros
    const formattedFilters = validateAndFormatFilters(filters);
    
    // Em um caso real, você enviaria a consulta para um serviço de embedding como OpenAI
    // Para simplificar, vamos simular um vetor de consulta
    const queryVector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Normalizar o vetor
    const magnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
    const normalizedVector = queryVector.map(val => val / magnitude);
    
    // Realizar consulta no banco de dados vetorial
    const results = await querySimilarVectors(normalizedVector, topK, formattedFilters);
    
    // Filtrar resultados por score mínimo se especificado
    const filteredResults = formattedFilters.minScore
      ? results.filter((r: QueryResult) => r.score >= (formattedFilters.minScore || 0))
      : results;
    
    // Responder com os resultados
    return res.status(200).json({ 
      results: filteredResults,
      query,
      metadata: {
        topK,
        filters: formattedFilters,
        totalResults: filteredResults.length,
        executionTime: Date.now()
      }
    });
  } catch (error) {
    logger.error('Erro ao consultar vetores:', error);
    return res.status(500).json({ error: 'Erro ao processar consulta vetorial' });
  }
});

/**
 * @route POST /api/vector/store
 * @description Armazena dados no banco de dados vetorial
 */
router.post('/store', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Obter parâmetros da requisição
    const { data, type, symbol } = req.body;
    
    // Verificar parâmetros obrigatórios
    if (!data || !type || !symbol) {
      return res.status(400).json({ 
        error: 'Parâmetros incompletos. Forneça data, type e symbol' 
      });
    }
    
    // Verificar tipo válido
    if (!VALID_DATA_TYPES.includes(type as DataType)) {
      return res.status(400).json({ 
        error: `Tipo inválido. Valores aceitos: ${VALID_DATA_TYPES.join(', ')}` 
      });
    }
    
    // Criar embedding e armazenar no banco de dados vetorial
    const vectorId = await createDataEmbedding(data, type as DataType, symbol);
    
    // Responder com confirmação
    return res.status(201).json({ 
      message: 'Dados armazenados com sucesso',
      vectorId,
      type,
      symbol,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao armazenar dados no banco vetorial:', error);
    return res.status(500).json({ error: 'Erro ao armazenar dados' });
  }
});

/**
 * @route GET /api/vector/similar/:symbol
 * @description Encontra ativos similares a um dado ativo
 */
router.get('/similar/:symbol', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const minScore = parseFloat(req.query.minScore as string) || 0.7;
    
    // Verificar parâmetro
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do ativo é obrigatório' });
    }
    
    // Buscar ativo no banco de dados
    const asset = await CryptoAsset.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    
    // Gerar embedding para o ativo
    const embedding = await generateAssetEmbedding(asset);
    
    // Buscar ativos similares com filtros
    const similarAssets = await querySimilarVectors(embedding, limit, {
      type: 'asset' as DataType,
      minScore
    });
    
    // Responder com os resultados
    return res.status(200).json({ 
      symbol: symbol.toUpperCase(),
      similarAssets,
      metadata: {
        limit,
        minScore,
        totalResults: similarAssets.length,
        executionTime: Date.now()
      }
    });
  } catch (error) {
    logger.error(`Erro ao buscar ativos similares a ${req.params.symbol}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar ativos similares' });
  }
});

/**
 * @route GET /api/vector/debug/html
 * @description Mostra informações das coleções do Milvus e exemplos de dados em HTML
 */
router.get('/debug/html', async (req: Request, res: Response): Promise<Response> => {
  try {
    const milvus = getMilvusClient();
    const collections = await milvus.showCollections();
    
    // Parâmetros de paginação e filtro
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const selectedTokens = (req.query.tokens as string)?.split(',') || [];
    
    // Buscar todos os tokens únicos
    let allTokens: string[] = [];
    for (const collection of collections.data) {
      try {
        const results = await milvus.query({
          collection_name: collection.name,
          expr: '',
          output_fields: ['symbol'],
          limit: 1000
        });
        const tokens = results.data.map((item: any) => item.symbol?.toLowerCase()).filter(Boolean);
        allTokens = [...new Set([...allTokens, ...tokens])].sort();
      } catch (e) {
        logger.error(`Erro ao buscar tokens da coleção ${collection.name}:`, e);
      }
    }
    
    let html = `<html>
      <head>
        <title>Debug Milvus</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          table { border-collapse: collapse; margin-bottom: 32px; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #eee; }
          h2 { margin-top: 32px; }
          .pagination { margin: 20px 0; }
          .pagination a { 
            padding: 8px 16px; 
            text-decoration: none; 
            border: 1px solid #ddd;
            margin: 0 4px;
          }
          .pagination a.active { 
            background-color: #4CAF50;
            color: white;
            border: 1px solid #4CAF50;
          }
          .filters {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .filters input, .filters select {
            padding: 8px;
            margin-right: 10px;
          }
          .filters button {
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .token-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            margin: 10px 0;
            background: white;
          }
          .token-list label {
            display: block;
            margin: 5px 0;
          }
          .token-list input[type="checkbox"] {
            margin-right: 8px;
          }
          .selected-tokens {
            margin: 10px 0;
            font-size: 0.9em;
            color: #666;
          }
        </style>
      </head>
      <body>`;
    
    html += `<h1>Debug Milvus - Coleções</h1>`;
    html += `<p>Timestamp: ${new Date().toLocaleString()}</p>`;
    
    // Formulário de filtro
    html += `
      <div class="filters">
        <form method="GET" action="/api/vector/debug/html">
          <div>
            <strong>Filtrar por Tokens:</strong>
            <div class="token-list">
              ${allTokens.map(token => `
                <label>
                  <input type="checkbox" name="tokens" value="${token}" 
                    ${selectedTokens.includes(token) ? 'checked' : ''}>
                  ${token.toUpperCase()}
                </label>
              `).join('')}
            </div>
          </div>
          <div>
            <input type="number" name="limit" placeholder="Itens por página" 
              value="${limit}" min="1" max="100">
            <button type="submit">Filtrar</button>
          </div>
        </form>
        ${selectedTokens.length > 0 ? `
          <div class="selected-tokens">
            Tokens selecionados: ${selectedTokens.map(t => t.toUpperCase()).join(', ')}
          </div>
        ` : ''}
      </div>
    `;
    
    for (const collection of collections.data) {
      const stats = await milvus.getCollectionStatistics({ collection_name: collection.name });
      let sample = [];
      try {
        // Construir expressão de filtro se tokens forem selecionados
        let expr = '';
        if (selectedTokens.length > 0) {
          const tokenConditions = selectedTokens.map(token => 
            `symbol like '%${token}%'`
          );
          expr = tokenConditions.join(' or ');
        }
        
        const results = await milvus.query({
          collection_name: collection.name,
          expr: expr,
          output_fields: ['*'],
          limit: limit,
          offset: (page - 1) * limit
        });
        sample = results.data;
      } catch (e: any) {
        sample = [{ erro: 'Não foi possível buscar exemplos', detalhes: e.message }];
      }
      
      html += `<h2>Coleção: ${collection.name}</h2>`;
      html += `<strong>Stats:</strong> <pre>${JSON.stringify(stats.data, null, 2)}</pre>`;
      html += `<strong>Exemplos:</strong>`;
      
      if (sample.length > 0) {
        html += `<table><thead><tr>`;
        Object.keys(sample[0]).forEach(key => html += `<th>${key}</th>`);
        html += `</tr></thead><tbody>`;
        sample.forEach(row => {
          html += `<tr>`;
          Object.values(row).forEach(val => html += `<td>${typeof val === 'object' ? JSON.stringify(val) : val}</td>`);
          html += `</tr>`;
        });
        html += `</tbody></table>`;
        
        // Paginação
        const totalItems = stats.data.row_count;
        const totalPages = Math.ceil(totalItems / limit);
        
        html += `<div class="pagination">`;
        if (page > 1) {
          html += `<a href="/api/vector/debug/html?page=${page-1}&limit=${limit}&tokens=${selectedTokens.join(',')}">&laquo; Anterior</a>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
          if (i === page) {
            html += `<a href="#" class="active">${i}</a>`;
          } else {
            html += `<a href="/api/vector/debug/html?page=${i}&limit=${limit}&tokens=${selectedTokens.join(',')}">${i}</a>`;
          }
        }
        
        if (page < totalPages) {
          html += `<a href="/api/vector/debug/html?page=${page+1}&limit=${limit}&tokens=${selectedTokens.join(',')}">Próximo &raquo;</a>`;
        }
        html += `</div>`;
      } else {
        html += `<p>Nenhum exemplo encontrado.</p>`;
      }
    }
    
    html += `</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error: any) {
    logger.error('Erro ao consultar Milvus:', error);
    return res.status(500).send(`<h1>Erro ao consultar Milvus</h1><pre>${error.message}</pre>`);
  }
});

export default router; 