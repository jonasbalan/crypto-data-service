import { Request, Response } from 'express';
import { vectorProcessor } from '../services/vectorProcessor';
import { milvusService } from '../database/milvus';
import { logger } from '../utils/logger';
import { 
  processedVectorsCounter, 
  vectorSearchCounter,
  vectorProcessingTime,
  vectorSearchTime,
  vectorCollectionSize
} from '../metrics/vectorMetrics';

export class VectorController {
  public async processData(req: Request, res: Response): Promise<void> {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        res.status(400).json({ error: 'Dados inválidos. Esperado um array.' });
        return;
      }

      const timer = vectorProcessingTime.startTimer();
      await vectorProcessor.processMarketData(data);
      timer();

      // Incrementar métricas
      data.forEach(item => {
        processedVectorsCounter.inc({ symbol: item.symbol });
      });

      // Atualizar tamanho da coleção
      this.updateCollectionSize();

      res.status(201).json({ message: 'Dados processados com sucesso' });
    } catch (error) {
      logger.error('Erro ao processar dados:', error);
      res.status(500).json({ error: 'Erro interno ao processar dados' });
    }
  }

  public async searchVectors(req: Request, res: Response): Promise<void> {
    try {
      const { vector, limit = 10 } = req.body;

      if (!Array.isArray(vector)) {
        res.status(400).json({ error: 'Vetor inválido' });
        return;
      }

      vectorSearchCounter.inc();
      const timer = vectorSearchTime.startTimer();
      const results = await milvusService.search(vector, limit);
      timer();

      res.status(200).json(results);
    } catch (error) {
      logger.error('Erro ao buscar vetores:', error);
      res.status(500).json({ error: 'Erro interno ao buscar vetores' });
    }
  }

  public async getVectorStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await milvusService.getCollectionStats();
      res.status(200).json(stats);
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro interno ao obter estatísticas' });
    }
  }

  private async updateCollectionSize(): Promise<void> {
    try {
      const stats = await milvusService.getCollectionStats();
      if (stats && stats.row_count) {
        vectorCollectionSize.set(stats.row_count);
      }
    } catch (error) {
      logger.error('Erro ao atualizar tamanho da coleção:', error);
    }
  }
}

export const vectorController = new VectorController(); 