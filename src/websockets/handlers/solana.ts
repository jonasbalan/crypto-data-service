import { WebSocketHandlerBase } from './base';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../database/init';
import { CryptoAsset, IBlockchainTransaction } from '../../models/crypto';
import WebSocket from 'ws';

// Interface para resposta de subscrição
interface SolanaSubscriptionResponse {
  jsonrpc: string;
  id: number;
  result: number;
}

// Interface para notificação de transação
interface SolanaTransactionNotification {
  jsonrpc: string;
  method: string;
  params: {
    subscription: number;
    result: {
      context: {
        slot: number;
      };
      value: {
        signature: string;
        slot: number;
        err: any | null;
        memo: string | null;
        blockTime: number;
      };
    };
  };
}

// Interface para resposta de detalhes da transação
interface SolanaTransactionDetails {
  jsonrpc: string;
  id: number;
  result: {
    blockTime: number;
    meta: {
      err: any | null;
      fee: number;
      preBalances: number[];
      postBalances: number[];
      innerInstructions: any[];
      logMessages: string[];
      status: { Ok: null } | { Err: any };
    };
    transaction: {
      message: {
        accountKeys: string[];
        header: any;
        instructions: any[];
        recentBlockhash: string;
      };
      signatures: string[];
    };
  };
}

/**
 * Handler para WebSocket da Solana
 */
export class SolanaWebSocketHandler extends WebSocketHandlerBase {
  private subscriptionIds: Map<string, number> = new Map();
  private nextId: number = 1;
  private reconnecting: boolean = false;

  /**
   * Construtor para o handler da Solana
   */
  constructor() {
    // URL do WebSocket RPC da Solana
    const url = 'wss://api.mainnet-beta.solana.com';
    super(url);
  }

  /**
   * Manipulador para evento de abertura de conexão
   */
  protected onOpen(): void {
    logger.info('Conexão WebSocket da Solana estabelecida');
    
    // Subscrever em novas transações confirmadas
    this.subscribeToTransactions();
  }

  /**
   * Manipulador para mensagens recebidas
   * @param data Dados recebidos
   */
  protected onMessage(data: WebSocket.Data): void {
    try {
      // Converter os dados para objeto
      const message = JSON.parse(data.toString());
      
      // Verificar se é uma resposta de subscrição
      if (message.jsonrpc === '2.0' && message.result !== undefined && !message.method) {
        this.handleSubscriptionResponse(message as SolanaSubscriptionResponse);
      }
      // Verificar se é uma notificação
      else if (message.jsonrpc === '2.0' && message.method === 'signatureNotification') {
        this.handleTransactionNotification(message as SolanaTransactionNotification);
      }
    } catch (error) {
      logger.error('Erro ao processar mensagem WebSocket da Solana:', error);
    }
  }

  /**
   * Manipulador para erros na conexão
   * @param error Objeto de erro
   */
  protected onError(error: Error): void {
    logger.error(`Erro no WebSocket da Solana: ${error.message}`);
  }

  /**
   * Manipulador para fechamento da conexão
   * @param code Código de fechamento
   * @param reason Razão do fechamento
   */
  protected onClose(code: number, reason: string): void {
    logger.warn(`WebSocket da Solana fechado: ${code} - ${reason}`);
    
    // Limpar IDs de subscrição quando a conexão é fechada
    this.subscriptionIds.clear();
  }

  /**
   * Subscreve em transações confirmadas
   */
  private subscribeToTransactions(): void {
    if (!this.isConnected()) {
      logger.error('Não é possível subscrever: WebSocket não está conectado');
      return;
    }
    
    const subscriptionType = 'signatureSubscribe';
    const requestId = this.nextId++;
    
    // Criar solicitação para subscrever em todas as transações confirmadas
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: subscriptionType,
      params: [
        // Recebe todas as assinaturas confirmadas
        {
          commitment: 'confirmed'
        }
      ]
    };
    
    // Enviar solicitação
    this.send(JSON.stringify(request))
      .then(() => logger.debug(`Solicitação de subscrição enviada: ${subscriptionType} (ID: ${requestId})`))
      .catch(error => logger.error(`Erro ao enviar solicitação de subscrição: ${error.message}`));
  }

  /**
   * Processa resposta de subscrição
   * @param response Resposta de subscrição
   */
  private handleSubscriptionResponse(response: SolanaSubscriptionResponse): void {
    // Armazenar o ID de subscrição retornado
    this.subscriptionIds.set(`subscription_${response.id}`, response.result);
    
    logger.info(`Subscrição Solana confirmada: ID ${response.result}`);
  }

  /**
   * Processa notificação de transação
   * @param notification Notificação de transação
   */
  private async handleTransactionNotification(notification: SolanaTransactionNotification): Promise<void> {
    try {
      const signature = notification.params.result.value.signature;
      const slot = notification.params.result.value.slot;
      const error = notification.params.result.value.err;
      const timestamp = new Date(notification.params.result.value.blockTime * 1000);
      
      // Ignorar transações com erro
      if (error) {
        logger.debug(`Transação Solana com erro ignorada: ${signature}`);
        return;
      }
      
      // Obter detalhes da transação
      const transactionDetails = await this.getTransactionDetails(signature);
      
      if (transactionDetails) {
        // Extrair informações da transação
        const { from, to, amount, fee } = this.extractTransactionInfo(transactionDetails);
        
        // Criar objeto de transação
        const transaction: IBlockchainTransaction = {
          hash: signature,
          from,
          to,
          amount,
          fee,
          timestamp,
          blockNumber: slot,
          blockchain: 'solana'
        };
        
        // Publicar dados para Redis pub/sub (apenas se Redis estiver disponível)
        const redis = getRedisClient();
        if (redis) {
          await redis.publish('crypto:transaction:new', JSON.stringify({
            blockchain: 'solana',
            data: transaction
          }));
        }
        
        // Emitir evento para outros componentes internos
        this.emit('transaction', transaction);
        
        logger.debug(`Nova transação Solana: ${signature} - ${amount} SOL`);
        
        // Atualizar no banco de dados
        await this.updateTransactionInDatabase(transaction);
      }
    } catch (error) {
      logger.error('Erro ao processar notificação de transação Solana:', error);
    }
  }

  /**
   * Obtém detalhes da transação
   * @param signature Assinatura da transação
   * @returns Detalhes da transação
   */
  private async getTransactionDetails(signature: string): Promise<SolanaTransactionDetails | null> {
    try {
      const requestId = this.nextId++;
      
      // Criar solicitação para obter detalhes da transação
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'getTransaction',
        params: [
          signature,
          {
            encoding: 'json',
            commitment: 'confirmed'
          }
        ]
      };
      
      // Fazer requisição HTTP para obter detalhes (mais confiável que WebSocket para grandes respostas)
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();
      return data as SolanaTransactionDetails;
    } catch (error) {
      logger.error(`Erro ao obter detalhes da transação Solana: ${error}`);
      return null;
    }
  }

  /**
   * Extrai informações básicas da transação
   * @param details Detalhes da transação
   * @returns Informações básicas da transação
   */
  private extractTransactionInfo(details: SolanaTransactionDetails): { from: string; to: string; amount: number; fee: number } {
    try {
      const accountKeys = details.result.transaction.message.accountKeys;
      const fee = details.result.meta.fee / 1000000000; // Converter de lamports para SOL
      
      // Pegar o primeiro e segundo endereços como remetente e destinatário
      // (simplificação - em casos reais, a análise deve ser mais sofisticada)
      const from = accountKeys[0] || 'unknown';
      const to = accountKeys[1] || 'unknown';
      
      // Calcular valor transferido com base na diferença de saldos
      const preBalances = details.result.meta.preBalances;
      const postBalances = details.result.meta.postBalances;
      
      // Diferença no saldo do remetente, menos a taxa
      const fromBalanceDiff = (preBalances[0] - postBalances[0]) / 1000000000 - fee;
      
      // A quantidade transferida é a diferença no saldo do remetente, menos a taxa
      const amount = Math.max(0, fromBalanceDiff);
      
      return { from, to, amount, fee };
    } catch (error) {
      logger.error('Erro ao extrair informações da transação:', error);
      return { from: 'unknown', to: 'unknown', amount: 0, fee: 0 };
    }
  }

  /**
   * Atualiza transação no banco de dados
   * @param transaction Dados da transação
   */
  private async updateTransactionInDatabase(transaction: IBlockchainTransaction): Promise<void> {
    try {
      // Verificar se a transação envolve algum token que estamos monitorando
      // Exemplo: verificar se o endereço "to" ou "from" é um contrato conhecido
      
      // Neste exemplo, atualizamos o ativo Solana
      const asset = await CryptoAsset.findOne({ symbol: 'SOL' });
      
      if (asset) {
        // Adicionar ao histórico de transações
        asset.recentTransactions.push(transaction);
        
        // Limitar tamanho do histórico (manter apenas últimas 100 transações)
        if (asset.recentTransactions.length > 100) {
          asset.recentTransactions = asset.recentTransactions.slice(-100);
        }
        
        // Atualizar data da última modificação
        asset.lastUpdated = new Date();
        
        // Salvar no banco de dados
        await asset.save();
        
        logger.debug(`Transação Solana salva no banco de dados: ${transaction.hash}`);
      }
    } catch (error) {
      logger.error('Erro ao atualizar transação no banco de dados:', error);
    }
  }
} 