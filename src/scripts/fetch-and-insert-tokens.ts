import axios from 'axios';
import { getMilvusClient, initializeDatabases } from '../database/init';
import { logger } from '../utils/logger';

const BATCH_SIZE = 10; // Quantos tokens inserir por vez
const MAX_TOKENS = 1000; // Altere para mais se quiser
const SLEEP_BETWEEN_BATCHES = 5000; // ms
const VECTOR_DIM = 1536; // Dimensão do vetor de embedding

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para gerar embedding simples baseado nos dados do token
function generateSimpleEmbedding(tokenData: any): number[] {
  // Extrai características relevantes do token
  const features = [
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
    tokenData.market_data?.atl?.usd || 0,
    tokenData.market_data?.high_24h?.usd || 0,
    tokenData.market_data?.low_24h?.usd || 0,
    tokenData.market_data?.price_change_24h || 0,
    tokenData.market_data?.price_change_percentage_1h || 0,
    tokenData.market_data?.price_change_percentage_24h || 0,
    tokenData.market_data?.price_change_percentage_7d || 0,
    tokenData.market_data?.price_change_percentage_14d || 0,
    tokenData.market_data?.price_change_percentage_30d || 0,
    tokenData.market_data?.price_change_percentage_60d || 0,
    tokenData.market_data?.price_change_percentage_200d || 0,
    tokenData.market_data?.price_change_percentage_1y || 0,
    tokenData.market_data?.market_cap_change_24h || 0,
    tokenData.market_data?.market_cap_change_percentage_24h || 0,
    tokenData.market_data?.total_volume_change_24h || 0,
    tokenData.market_data?.total_volume_change_percentage_24h || 0,
    tokenData.market_data?.circulating_supply_change_24h || 0,
    tokenData.market_data?.circulating_supply_change_percentage_24h || 0,
    tokenData.market_data?.total_supply_change_24h || 0,
    tokenData.market_data?.total_supply_change_percentage_24h || 0,
    tokenData.market_data?.max_supply_change_24h || 0,
    tokenData.market_data?.max_supply_change_percentage_24h || 0,
  ];

  // Normaliza os valores para ficarem entre -1 e 1
  const normalizedFeatures = features.map(value => {
    if (value === 0) return 0;
    const absValue = Math.abs(value);
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.log10(absValue + 1) / 10);
  });

  // Preenche o resto do vetor com valores aleatórios normalizados
  const remainingDim = VECTOR_DIM - normalizedFeatures.length;
  const randomFeatures = Array(remainingDim).fill(0).map(() => Math.random() * 2 - 1);

  // Combina as features normalizadas com os valores aleatórios
  const combinedVector = [...normalizedFeatures, ...randomFeatures];

  // Normaliza o vetor final para ter magnitude 1
  const magnitude = Math.sqrt(combinedVector.reduce((sum, val) => sum + val * val, 0));
  return combinedVector.map(val => val / magnitude);
}

async function fetchTokens() {
  const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/list');
  return data; // [{id, symbol, name}]
}

async function fetchTokenDetails(id: string) {
  const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}`);
  return data;
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
    const dataToInsert = [];
    for (const token of batch) {
      try {
        const details = await fetchTokenDetails(token.id);
        // Gera embedding usando nossa função simplificada
        const embedding = generateSimpleEmbedding(details);
        dataToInsert.push({
          id: `${token.symbol}:${token.id}`,
          vector: embedding,
          symbol: token.symbol,
          type: 'price',
          timestamp: new Date().toISOString(),
          metadata: {
            name: token.name,
            categories: details.categories,
            description: details.description?.en,
            market_data: details.market_data,
            links: details.links
          }
        });
        logger.info(`Token ${token.symbol} (${token.id}) pronto para inserção.`);
      } catch (e: any) {
        logger.warn(`Erro ao processar ${token.symbol} (${token.id}): ${e.message}`);
      }
    }
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
    await sleep(SLEEP_BETWEEN_BATCHES); // Evita rate limit
  }
  logger.info('Script de inserção de tokens concluído!');
}

main().catch(e => {
  logger.error('Erro fatal no script:', e);
  process.exit(1);
}); 