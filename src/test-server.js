const express = require('express');

const app = express();
const port = 3001;

// Middleware básico
app.use(express.json());

// Rota de teste simples
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor de teste funcionando' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API de teste funcionando' });
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada no servidor de teste' });
});

app.listen(port, () => {
  console.log(`Servidor de teste rodando na porta ${port}`);
}); 