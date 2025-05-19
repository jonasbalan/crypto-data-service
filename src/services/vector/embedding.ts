import { getPineconeClient } from '../../database/init';
import { CryptoAsset } from '../../models/crypto';
import { logger } from '../../utils/logger';

/**
 * Interface para metadados de vetor
 */
interface VectorMetadata {
  symbol: string;
  name: string;
  type: 'asset' | 'price' | 'social' | 'technical' | 'transaction';
  timestamp: string;
  source: string;
  [key: string]: any;
}

/**
 * Gera embedding textual para um ativo de criptomoeda
 * Este é um exemplo simplificado, em produção você usaria
 * um modelo de linguagem adequado como OpenAI para gerar embeddings
 * 
 * @param asset Ativo de criptomoeda
 * @returns Vetor de embedding
 */
export async function generateAssetEmbedding(asset: any): Promise<number[]> {
  try {
    // Em um cenário real, você enviaria o texto para um serviço de embedding como OpenAI
    // Para este exemplo, criamos um vetor aleatório de 1536 dimensões
    // (dimensão típica dos embeddings da OpenAI)
    
    // Texto que descreveremos o ativo (seria enviado para o modelo de embedding)
    const assetDescription = `
      Criptomoeda ${asset.name} (${asset.symbol}) na blockchain ${asset.chainId}.
      Preço atual: $${asset.currentPrice}.
      Volume de 24h: $${asset.priceHistory[0]?.volume24h || 0}.
      Capitalização de mercado: $${asset.priceHistory[0]?.marketCap || 0}.
      Variação 24h: ${asset.priceHistory[0]?.change24h || 0}%.
      Descrição: ${asset.description || 'Não disponível'}.
    `;
    
    // Simulação de um vetor de embedding de 1536 dimensões
    const embeddingVector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Normalizar o vetor (importante para busca por similaridade de cosseno)
    const magnitude = Math.sqrt(embeddingVector.reduce((sum, val) => sum + val * val, 0));
    const normalizedVector = embeddingVector.map(val => val / magnitude);
    
    return normalizedVector;
  } catch (error) {
    logger.error('Erro ao gerar embedding para ativo:', error);
    throw error;
  }
}

/**
 * Armazena um embedding vetorial no Pinecone
 * 
 * @param id ID único do vetor
 * @param vector Vetor de embedding
 * @param metadata Metadados associados ao vetor
 */
export async function storeVectorInPinecone(
  id: string,
  vector: number[],
  metadata: VectorMetadata
): Promise<void> {
  try {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX || 'crypto-vectors';
    
    // Obter o índice
    const index = pinecone.Index(indexName);
    
    // Inserir vetor no índice
    await index.upsert({
      vectors: [
        {
          id,
          values: vector,
          metadata
        }
      ]
    });
    
    logger.debug(`Vetor armazenado no Pinecone: ${id}`);
  } catch (error) {
    logger.error(`Erro ao armazenar vetor no Pinecone: ${error}`);
    throw error;
  }
}

/**
 * Busca vetores similares no Pinecone
 * 
 * @param queryVector Vetor de consulta
 * @param topK Número de resultados a retornar
 * @param filter Filtro opcional para metadados
 * @returns Resultados da consulta
 */
export async function querySimilarVectors(
  queryVector: number[],
  topK: number = 10,
  filter?: any
): Promise<any> {
  try {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX || 'crypto-vectors';
    
    // Obter o índice
    const index = pinecone.Index(indexName);
    
    // Consultar vetores similares
    const queryResult = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter
    });
    
    return queryResult.matches;
  } catch (error) {
    logger.error(`Erro ao consultar vetores no Pinecone: ${error}`);
    throw error;
  }
}

/**
 * Atualiza os embeddings de todos os ativos no banco de dados
 */
export async function updateAllAssetEmbeddings(): Promise<void> {
  try {
    // Obter todos os ativos
    const assets = await CryptoAsset.find({});
    
    logger.info(`Atualizando embeddings para ${assets.length} ativos`);
    
    // Processar cada ativo
    for (const asset of assets) {
      // Gerar embedding
      const embedding = await generateAssetEmbedding(asset);
      
      // Criar metadados
      const metadata: VectorMetadata = {
        symbol: asset.symbol,
        name: asset.name,
        type: 'asset',
        timestamp: new Date().toISOString(),
        source: 'system',
        price: asset.currentPrice,
        chainId: asset.chainId
      };
      
      // ID único para o vetor
      const vectorId = `asset:${asset.symbol}:${Date.now()}`;
      
      // Armazenar no Pinecone
      await storeVectorInPinecone(vectorId, embedding, metadata);
      
      // Atualizar referência no ativo
      asset.vectorId = vectorId;
      await asset.save();
      
      logger.debug(`Embedding atualizado para ${asset.symbol}`);
    }
    
    logger.info('Atualização de embeddings concluída');
  } catch (error) {
    logger.error('Erro ao atualizar embeddings:', error);
    throw error;
  }
}

/**
 * Gerar e armazenar embedding para dados específicos de criptomoeda
 * 
 * @param data Dados a serem armazenados
 * @param type Tipo de dados
 * @param symbol Símbolo da criptomoeda
 */
export async function createDataEmbedding(
  data: any,
  type: 'price' | 'social' | 'technical' | 'transaction',
  symbol: string
): Promise<string> {
  try {
    // Construir texto que representa os dados (seria enviado para um modelo de embedding em produção)
    let dataText = '';
    
    switch (type) {
      case 'price':
        dataText = `
          Atualização de preço para ${symbol}.
          Preço: $${data.price}.
          Volume 24h: $${data.volume24h}.
          Variação 24h: ${data.change24h}%.
          Variação 7d: ${data.change7d}%.
          Fonte: ${data.source}.
          Timestamp: ${new Date(data.timestamp).toISOString()}.
        `;
        break;
        
      case 'social':
        dataText = `
          Dados sociais para ${symbol}.
          Plataforma: ${data.platform}.
          Sentimento: ${data.sentiment}.
          Contagem de posts: ${data.postCount}.
          Engajamento: ${data.engagementScore}.
          Timestamp: ${new Date(data.timestamp).toISOString()}.
        `;
        break;
        
      case 'technical':
        dataText = `
          Indicador técnico para ${symbol}.
          Indicador: ${data.indicator}.
          Valor: ${data.value}.
          Sinal: ${data.signal}.
          Timestamp: ${new Date(data.timestamp).toISOString()}.
        `;
        break;
        
      case 'transaction':
        dataText = `
          Transação na blockchain para ${symbol}.
          Hash: ${data.hash}.
          De: ${data.from}.
          Para: ${data.to}.
          Valor: ${data.amount}.
          Taxa: ${data.fee}.
          Blockchain: ${data.blockchain}.
          Timestamp: ${new Date(data.timestamp).toISOString()}.
        `;
        break;
    }
    
    // Simulação de um vetor de embedding de 1536 dimensões
    const embeddingVector = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Normalizar o vetor (importante para busca por similaridade de cosseno)
    const magnitude = Math.sqrt(embeddingVector.reduce((sum, val) => sum + val * val, 0));
    const normalizedVector = embeddingVector.map(val => val / magnitude);
    
    // Criar metadados
    const metadata: VectorMetadata = {
      symbol,
      name: symbol, // Poderíamos buscar o nome completo no banco de dados
      type,
      timestamp: new Date().toISOString(),
      source: data.source || 'system',
      ...data
    };
    
    // ID único para o vetor
    const vectorId = `${type}:${symbol}:${Date.now()}`;
    
    // Armazenar no Pinecone
    await storeVectorInPinecone(vectorId, normalizedVector, metadata);
    
    return vectorId;
  } catch (error) {
    logger.error(`Erro ao criar embedding para dados de ${type}:`, error);
    throw error;
  }
} 