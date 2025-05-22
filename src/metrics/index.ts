import { Express } from 'express';
import { Registry, collectDefaultMetrics, Histogram, Gauge, Counter } from 'prom-client';
import { logger } from '../utils/logger';

const register = new Registry();
collectDefaultMetrics({ register });

// Exportar todas as métricas de vetores
export * from './vectorMetrics';

// Contador de requisições HTTP
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'path', 'status']
});

// Gauge para conexões WebSocket ativas
export const activeWebSocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Número de conexões WebSocket ativas'
});

// Métricas personalizadas
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const dataCollectionLatency = new Histogram({
  name: 'data_collection_latency_seconds',
  help: 'Latência da coleta de dados em segundos',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const vectorOperationsDuration = new Histogram({
  name: 'vector_operations_duration_seconds',
  help: 'Duração das operações vetoriais em segundos',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const setupMetrics = (app: Express): void => {
  try {
    // Endpoint para métricas
    app.get('/metrics', (req, res) => {
      res.set('Content-Type', register.contentType);
      register.metrics().then(metrics => res.end(metrics));
    });

    // Middleware para contar requisições
    app.use((req, res, next) => {
      const end = res.end;
      res.end = function (chunk?: any, encoding?: any): any {
        httpRequestsTotal.inc({
          method: req.method,
          path: req.route ? req.route.path : req.path,
          status: res.statusCode
        });
        res.end = end;
        return res.end(chunk, encoding);
      };
      next();
    });

    logger.info('Métricas configuradas com sucesso');
  } catch (error) {
    logger.error('Erro ao configurar métricas:', error);
  }
}; 