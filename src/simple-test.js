const express = require('express');

const app = express();
const port = 3003;

// Middleware básico
app.use(express.json());

// Middleware de debug
app.use((req, res, next) => {
  console.log(`[SIMPLE] ${req.method} ${req.url}`);
  next();
});

// Rota de teste simples
app.get('/health', (req, res) => {
  console.log('[SIMPLE] Health endpoint chamado');
  res.json({ status: 'ok', message: 'Simple test funcionando' });
});

// Rota de API
app.get('/api/test', (req, res) => {
  console.log('[SIMPLE] API test endpoint chamado');
  res.json({ message: 'API simple test funcionando' });
});

// Middleware de fallback
app.use((req, res) => {
  console.log(`[SIMPLE] Fallback para: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Rota não encontrada no simple test' });
});

app.listen(port, () => {
  console.log(`Simple test server rodando na porta ${port}`);
}); 