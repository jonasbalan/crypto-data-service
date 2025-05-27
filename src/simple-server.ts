import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket';

const app = express();
const server = createServer(app);
const port = 3000;

// Middleware básico
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Iniciar servidor
server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  
  // Inicializar WebSocket
  try {
    const wsService = new WebSocketService(server);
    console.log('WebSocket inicializado');
  } catch (error) {
    console.error('Erro no WebSocket:', error);
  }
}); 