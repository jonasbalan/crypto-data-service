import { logger } from './logger';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Configuração
const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const DEBUG_LOG_DIR = path.join(__dirname, '../../logs/debug');
const SLOW_QUERY_THRESHOLD = 500; // ms

// Criar diretório de logs de debug se não existir
if (DEBUG_MODE && !fs.existsSync(DEBUG_LOG_DIR)) {
  fs.mkdirSync(DEBUG_LOG_DIR, { recursive: true });
}

/**
 * Função para debug com informações adicionais
 * @param message Mensagem para debug
 * @param data Dados adicionais para debug
 */
export function debugLog(message: string, data?: any): void {
  if (!DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    data: data || null
  };
  
  // Enviar para o console
  logger.debug(`DEBUG: ${message}`, data);
  
  // Salvar em arquivo
  const logFile = path.join(DEBUG_LOG_DIR, `debug-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Middleware para debug de requisições e respostas
 */
export function requestDebugMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!DEBUG_MODE) {
    return next();
  }
  
  // Registrar tempo de início
  const startTime = performance.now();
  
  // Registrar dados da requisição
  debugLog('Requisição recebida', {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  
  // Interceptar a resposta
  const originalSend = res.send;
  res.send = function(body) {
    // Registrar tempo de resposta
    const responseTime = performance.now() - startTime;
    
    // Verificar se a resposta foi lenta
    if (responseTime > SLOW_QUERY_THRESHOLD) {
      logger.warn(`Requisição lenta: ${req.method} ${req.url} - ${responseTime.toFixed(2)}ms`);
    }
    
    // Registrar dados da resposta
    debugLog('Resposta enviada', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      body: typeof body === 'string' ? body.substring(0, 1000) : '[não-texto]' // limitar tamanho
    });
    
    // Chamar o método original
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Função para debug de consulta de banco de dados
 * @param operation Nome da operação
 * @param query Query executada
 * @param result Resultado da query
 * @param error Erro, se houver
 */
export function debugDatabase(operation: string, query: any, result?: any, error?: any): void {
  if (!DEBUG_MODE) return;
  
  const startTime = performance.now();
  
  // Após a conclusão da operação
  const executionTime = performance.now() - startTime;
  
  debugLog(`DB ${operation}`, {
    query,
    executionTime: `${executionTime.toFixed(2)}ms`,
    result: result ? (typeof result === 'object' ? '[resultado-objeto]' : result) : null,
    error: error || null
  });
  
  // Registrar queries lentas
  if (executionTime > SLOW_QUERY_THRESHOLD) {
    logger.warn(`Query lenta (${executionTime.toFixed(2)}ms): ${operation}`, { query });
  }
}

/**
 * Função para debug de websocket
 * @param type Tipo do evento
 * @param data Dados do evento
 */
export function debugWebSocket(type: string, data: any): void {
  if (!DEBUG_MODE) return;
  
  debugLog(`WebSocket ${type}`, data);
}

/**
 * Gera uma representação visual dos dados para console
 * @param data Dados para visualizar
 */
export function visualize(data: any): void {
  if (!DEBUG_MODE) return;
  
  if (Array.isArray(data)) {
    logger.debug('Visualização de array:', {
      tipo: 'Array',
      tamanho: data.length,
      amostra: data.slice(0, 5),
      temMais: data.length > 5
    });
  } else if (typeof data === 'object' && data !== null) {
    logger.debug('Visualização de objeto:', {
      tipo: 'Objeto',
      keys: Object.keys(data),
      amostra: JSON.stringify(data, null, 2).substring(0, 500)
    });
  } else {
    logger.debug('Visualização de valor:', {
      tipo: typeof data,
      valor: data
    });
  }
}

/**
 * Inicia um timer para medir performance
 * @param label Nome do timer
 */
export function startTimer(label: string): void {
  if (!DEBUG_MODE) return;
  
  if (!global.hasOwnProperty('__debugTimers')) {
    (global as any).__debugTimers = {};
  }
  
  (global as any).__debugTimers[label] = performance.now();
  logger.debug(`Timer iniciado: ${label}`);
}

/**
 * Encerra um timer e retorna o tempo decorrido
 * @param label Nome do timer
 * @returns Tempo decorrido em ms
 */
export function endTimer(label: string): number {
  if (!DEBUG_MODE) return 0;
  
  if (!global.hasOwnProperty('__debugTimers') || !(global as any).__debugTimers[label]) {
    logger.warn(`Timer não encontrado: ${label}`);
    return 0;
  }
  
  const startTime = (global as any).__debugTimers[label];
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logger.debug(`Timer ${label}: ${duration.toFixed(2)}ms`);
  
  delete (global as any).__debugTimers[label];
  
  return duration;
}

/**
 * Inspetor de memória para detectar possíveis vazamentos
 */
export function checkMemoryUsage(): void {
  if (!DEBUG_MODE) return;
  
  const memoryUsage = process.memoryUsage();
  
  logger.debug('Uso de memória:', {
    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,       // Memória total reservada
    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,  // Memória total alocada
    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,   // Memória em uso
    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`    // Memória de objetos externos (C++)
  });
} 