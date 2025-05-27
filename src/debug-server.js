const express = require('express');

const app = express();
const port = 3002;

// Middleware básico
app.use(express.json());

// Middleware de debug
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Rota de teste simples
app.get('/health', (req, res) => {
  console.log('[DEBUG] Health endpoint chamado');
  res.json({ status: 'ok', message: 'Debug server funcionando' });
});

// Rota de API
app.get('/api/test', (req, res) => {
  console.log('[DEBUG] API test endpoint chamado');
  res.json({ message: 'API debug funcionando' });
});

// Middleware de fallback
app.use((req, res) => {
  console.log(`[DEBUG] Fallback para: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Rota não encontrada no debug server' });
});

app.listen(port, () => {
  console.log(`Debug server rodando na porta ${port}`);
}); 