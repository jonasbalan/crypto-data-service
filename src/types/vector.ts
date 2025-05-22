export interface VectorMetadata {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  marketCap?: number;
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  distance: number;
  metadata: VectorMetadata;
}

export interface VectorInsertRequest {
  vectors: number[][];
  metadata: VectorMetadata[];
}

export interface VectorSearchRequest {
  vector: number[];
  limit?: number;
} 