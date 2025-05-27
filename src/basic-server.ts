import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

// Middleware básico
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor básico rodando na porta ${port}`);
}); 