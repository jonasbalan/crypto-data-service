import { Counter, Gauge, Histogram } from 'prom-client';

// Contador para dados processados
export const processedVectorsCounter = new Counter({
  name: 'vector_processed_total',
  help: 'Total de vetores processados',
  labelNames: ['symbol']
});

// Contador para buscas de vetores
export const vectorSearchCounter = new Counter({
  name: 'vector_search_total',
  help: 'Total de buscas de vetores'
});

// Gauge para tamanho da coleção
export const vectorCollectionSize = new Gauge({
  name: 'vector_collection_size',
  help: 'Número total de vetores na coleção'
});

// Histograma para tempo de processamento
export const vectorProcessingTime = new Histogram({
  name: 'vector_processing_time_seconds',
  help: 'Tempo de processamento de vetores em segundos',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Histograma para tempo de busca
export const vectorSearchTime = new Histogram({
  name: 'vector_search_time_seconds',
  help: 'Tempo de busca de vetores em segundos',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
}); 