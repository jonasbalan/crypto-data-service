import axios from 'axios';
import { getMilvusClient, initializeDatabases } from '../database/init';
import { logger } from '../utils/logger';

const BATCH_SIZE = 100; // Aumentado de 50 para 100
const MAX_TOKENS = 10000; // Aumentado de 5000 para 10000
const SLEEP_BETWEEN_BATCHES = 500; // Reduzido de 1000 para 500ms
const VECTOR_DIM = 1536; // Dimensão do vetor de embedding
const MAX_CONCURRENT_REQUESTS = 10; // Aumentado de 5 para 10

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para gerar embedding simples baseado nos dados do token
function generateSimpleEmbedding(tokenData: any): number[] {
  // Extrai características relevantes do token de forma mais eficiente
  const features = new Float64Array([
    tokenData.market_data?.current_price?.usd || 0,
    tokenData.market_data?.market_cap?.usd || 0,
    tokenData.market_data?.total_volume?.usd || 0,
    tokenData.market_data?.price_change_percentage_24h || 0,
    tokenData.market_data?.price_change_percentage_7d || 0,
    tokenData.market_data?.price_change_percentage_30d || 0,
    tokenData.market_data?.circulating_supply || 0,
    tokenData.market_data?.total_supply || 0,
    tokenData.market_data?.max_supply || 0,
    tokenData.market_data?.ath?.usd || 0,
    tokenData.market_data?.ath_change_percentage?.usd || 0,
    tokenData.market_data?.atl?.usd || 0,
    tokenData.market_data?.atl_change_percentage?.usd || 0
  ]);

  // Normaliza os valores de forma mais eficiente usando SIMD-like operations
  const normalizedFeatures = new Float64Array(features.length);
  let maxAbsValue = 0;
  
  // Primeiro passo: encontrar o maior valor absoluto
  for (let i = 0; i < features.length; i++) {
    const absValue = Math.abs(features[i]);
    if (absValue > maxAbsValue) maxAbsValue = absValue;
  }
  
  // Segundo passo: normalizar usando o maior valor
  const scale = maxAbsValue > 0 ? 1 / maxAbsValue : 1;
  for (let i = 0; i < features.length; i++) {
    normalizedFeatures[i] = features[i] * scale;
  }

  // Preenche o resto do vetor com valores aleatórios normalizados
  const remainingDim = VECTOR_DIM - normalizedFeatures.length;
  const randomFeatures = new Float64Array(remainingDim);
  
  // Gera números aleatórios em batch para melhor performance
  const randomBatch = new Float64Array(1024);
  for (let i = 0; i < remainingDim; i += 1024) {
    const batchSize = Math.min(1024, remainingDim - i);
    for (let j = 0; j < batchSize; j++) {
      randomBatch[j] = Math.random() * 2 - 1;
    }
    randomFeatures.set(randomBatch.subarray(0, batchSize), i);
  }

  // Combina as features normalizadas com os valores aleatórios
  const combinedVector = new Float64Array(VECTOR_DIM);
  combinedVector.set(normalizedFeatures);
  combinedVector.set(randomFeatures, normalizedFeatures.length);

  // Normaliza o vetor final usando SIMD-like operations
  let magnitude = 0;
  for (let i = 0; i < combinedVector.length; i++) {
    magnitude += combinedVector[i] * combinedVector[i];
  }
  magnitude = Math.sqrt(magnitude);

  const finalVector = new Float64Array(VECTOR_DIM);
  const invMagnitude = 1 / magnitude;
  for (let i = 0; i < combinedVector.length; i++) {
    finalVector[i] = combinedVector[i] * invMagnitude;
  }

  return Array.from(finalVector);
}

async function fetchTokens() {
  const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/list');
  return data; // [{id, symbol, name}]
}

async function fetchTokenDetails(id: string) {
  const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}`);
  return data;
}

async function processBatch(tokens: any[], startIndex: number): Promise<any[]> {
  const dataToInsert = [];
  const promises = tokens.map(async (token) => {
    try {
      const details = await fetchTokenDetails(token.id);
      const embedding = generateSimpleEmbedding(details);
      
      // Pré-processa os metadados para reduzir o tamanho
      const metadata = {
        name: token.name,
        categories: details.categories?.slice(0, 3) || [], // Limita a 3 categorias
        description: details.description?.en?.substring(0, 200) || '', // Limita a 200 caracteres
        market_data: {
          price: details.market_data?.current_price?.usd,
          market_cap: details.market_data?.market_cap?.usd,
          volume: details.market_data?.total_volume?.usd,
          change_24h: details.market_data?.price_change_percentage_24h
        },
        links: {
          homepage: details.links?.homepage?.[0],
          twitter: details.links?.twitter_screen_name,
          telegram: details.links?.telegram_channel_identifier
        }
      };

      return {
        id: `${token.symbol}:${token.id}`,
        vector: embedding,
        symbol: token.symbol,
        type: 'price',
        timestamp: new Date().toISOString(),
        metadata
      };
    } catch (e: any) {
      logger.warn(`Erro ao processar ${token.symbol} (${token.id}): ${e.message}`);
      return null;
    }
  });

  // Processa as promessas em chunks para melhor performance
  const chunkSize = 5;
  const results = [];
  
  for (let i = 0; i < promises.length; i += chunkSize) {
    const chunk = promises.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk);
    results.push(...chunkResults.filter(result => result !== null));
  }

  return results;
}

async function main() {
  await initializeDatabases();
  const milvus = getMilvusClient();
  const collectionName = 'crypto_vectors';

  logger.info('Buscando lista de tokens do CoinGecko...');
  const tokens = await fetchTokens();
  logger.info(`Total de tokens encontrados: ${tokens.length}`);

  let processed = 0;
  for (let i = 0; i < Math.min(tokens.length, MAX_TOKENS); i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    
    // Processar batches em paralelo
    const batchPromises = [];
    for (let j = 0; j < batch.length; j += MAX_CONCURRENT_REQUESTS) {
      const subBatch = batch.slice(j, j + MAX_CONCURRENT_REQUESTS);
      batchPromises.push(processBatch(subBatch, i + j));
    }
    
    const batchResults = await Promise.all(batchPromises);
    const dataToInsert = batchResults.flat();

    if (dataToInsert.length > 0) {
      try {
        await milvus.insert({
          collection_name: collectionName,
          data: dataToInsert
        });
        logger.info(`Batch ${i / BATCH_SIZE + 1}: Inseridos ${dataToInsert.length} tokens.`);
      } catch (e: any) {
        logger.error(`Erro ao inserir batch: ${e.message}`);
      }
    }
    
    processed += batch.length;
    logger.info(`Progresso: ${processed}/${MAX_TOKENS}`);
    await sleep(SLEEP_BETWEEN_BATCHES);
  }
  logger.info('Script de inserção de tokens concluído!');
}

main().catch(e => {
  logger.error('Erro fatal no script:', e);
  process.exit(1);
}); 