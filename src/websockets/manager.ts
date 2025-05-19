import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { BinanceWebSocketHandler } from './handlers/binance';
import { SolanaWebSocketHandler } from './handlers/solana';
import { WebSocketHandlerBase } from './handlers/base';

// Armazenar todas as conexões websocket
const websocketConnections: Map<string, WebSocketHandlerBase> = new Map();

/**
 * Inicializa todas as conexões websocket necessárias
 */
export async function initializeWebsockets(): Promise<void> {
  try {
    // Inicializar websocket da Binance
    const binanceHandler = new BinanceWebSocketHandler();
    await binanceHandler.connect();
    websocketConnections.set('binance', binanceHandler);
    
    // Inicializar websocket da Solana
    const solanaHandler = new SolanaWebSocketHandler();
    await solanaHandler.connect();
    websocketConnections.set('solana', solanaHandler);
    
    // Configurar verificação periódica de conexões
    startConnectionHealthCheck();
    
    logger.info('Todas as conexões websocket inicializadas com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar conexões websocket:', error);
    throw error;
  }
}

/**
 * Verifica periodicamente a saúde das conexões websocket
 * e reconecta se necessário
 */
function startConnectionHealthCheck(): void {
  setInterval(async () => {
    for (const [name, handler] of websocketConnections.entries()) {
      if (!handler.isConnected()) {
        logger.warn(`Conexão websocket ${name} não está ativa. Tentando reconectar...`);
        try {
          await handler.reconnect();
          logger.info(`Reconexão websocket ${name} bem-sucedida`);
        } catch (error) {
          logger.error(`Falha ao reconectar websocket ${name}:`, error);
        }
      }
    }
  }, 30000); // Verificar a cada 30 segundos
}

/**
 * Finaliza todas as conexões websocket
 */
export async function shutdownWebsockets(): Promise<void> {
  try {
    const shutdownPromises = Array.from(websocketConnections.values()).map(
      handler => handler.disconnect()
    );
    
    await Promise.all(shutdownPromises);
    websocketConnections.clear();
    
    logger.info('Todas as conexões websocket finalizadas com sucesso');
  } catch (error) {
    logger.error('Erro ao finalizar conexões websocket:', error);
    throw error;
  }
}

/**
 * Obtém um handler de websocket específico
 * @param name Nome do handler (ex: 'binance', 'solana')
 * @returns O handler de websocket solicitado
 */
export function getWebSocketHandler(name: string): WebSocketHandlerBase | undefined {
  return websocketConnections.get(name);
} 