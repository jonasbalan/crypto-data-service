import mongoose, { Document, Schema } from 'mongoose';

// Interface para preço da criptomoeda
export interface IPriceData {
  price: number;
  volume24h: number;
  marketCap: number;
  change24h: number;
  change7d: number;
  timestamp: Date;
  source: string;
}

// Interface para dados sociais
export interface ISocialData {
  platform: string;
  sentiment: number;
  postCount: number;
  engagementScore: number;
  timestamp: Date;
}

// Interface para dados técnicos
export interface ITechnicalData {
  indicator: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  timestamp: Date;
}

// Interface para transações na blockchain
export interface IBlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: Date;
  blockNumber: number;
  blockchain: string;
}

// Interface para dados de liquidez
export interface ILiquidityData {
  exchange: string;
  pair: string;
  totalLiquidity: number;
  priceImpact: number;
  timestamp: Date;
}

// Interface para documento principal de criptomoeda
export interface ICryptoAsset extends Document {
  symbol: string;
  name: string;
  chainId: string;
  contractAddress?: string;
  description?: string;
  logo?: string;
  website?: string;
  currentPrice: number;
  priceHistory: IPriceData[];
  socialData: ISocialData[];
  technicalData: ITechnicalData[];
  recentTransactions: IBlockchainTransaction[];
  liquidityData: ILiquidityData[];
  lastUpdated: Date;
  createdAt: Date;
  vectorId?: string; // ID do vetor no banco de dados vetorial
}

// Schema para preço da criptomoeda
const PriceDataSchema = new Schema<IPriceData>({
  price: { type: Number, required: true },
  volume24h: { type: Number, required: true },
  marketCap: { type: Number, required: true },
  change24h: { type: Number, required: true },
  change7d: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  source: { type: String, required: true }
});

// Schema para dados sociais
const SocialDataSchema = new Schema<ISocialData>({
  platform: { type: String, required: true },
  sentiment: { type: Number, required: true },
  postCount: { type: Number, required: true },
  engagementScore: { type: Number, required: true },
  timestamp: { type: Date, required: true }
});

// Schema para dados técnicos
const TechnicalDataSchema = new Schema<ITechnicalData>({
  indicator: { type: String, required: true },
  value: { type: Number, required: true },
  signal: { type: String, enum: ['buy', 'sell', 'neutral'], required: true },
  timestamp: { type: Date, required: true }
});

// Schema para transações na blockchain
const BlockchainTransactionSchema = new Schema<IBlockchainTransaction>({
  hash: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true },
  fee: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  blockNumber: { type: Number, required: true },
  blockchain: { type: String, required: true }
});

// Schema para dados de liquidez
const LiquidityDataSchema = new Schema<ILiquidityData>({
  exchange: { type: String, required: true },
  pair: { type: String, required: true },
  totalLiquidity: { type: Number, required: true },
  priceImpact: { type: Number, required: true },
  timestamp: { type: Date, required: true }
});

// Schema principal de criptomoeda
const CryptoAssetSchema = new Schema<ICryptoAsset>({
  symbol: { type: String, required: true, index: true },
  name: { type: String, required: true, index: true },
  chainId: { type: String, required: true },
  contractAddress: { type: String },
  description: { type: String },
  logo: { type: String },
  website: { type: String },
  currentPrice: { type: Number, required: true },
  priceHistory: [PriceDataSchema],
  socialData: [SocialDataSchema],
  technicalData: [TechnicalDataSchema],
  recentTransactions: [BlockchainTransactionSchema],
  liquidityData: [LiquidityDataSchema],
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  vectorId: { type: String }
}, {
  timestamps: true
});

// Criar índices para consultas eficientes
CryptoAssetSchema.index({ symbol: 1, chainId: 1 }, { unique: true });
CryptoAssetSchema.index({ currentPrice: 1 });
CryptoAssetSchema.index({ "priceHistory.timestamp": 1 });

// Criar e exportar o modelo
export const CryptoAsset = mongoose.model<ICryptoAsset>('CryptoAsset', CryptoAssetSchema); 