import React from 'react';
import { Box, Typography, Alert, AlertTitle, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const TechnicalAnalysis: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Análise Técnica
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Em Desenvolvimento</AlertTitle>
        Esta funcionalidade está em desenvolvimento. Os indicadores técnicos básicos já estão implementados 
        no backend, mas a interface de usuário ainda está sendo construída.
      </Alert>
      
      <Typography variant="body1" paragraph>
        A análise técnica utilizará os seguintes indicadores:
      </Typography>
      
      <ul>
        <li>Médias Móveis Simples (SMA) e Exponenciais (EMA)</li>
        <li>Índice de Força Relativa (RSI)</li>
        <li>Bandas de Bollinger</li>
        <li>MACD (Moving Average Convergence Divergence)</li>
        <li>Volume Profile</li>
        <li>Ichimoku Cloud (em breve)</li>
        <li>Fibonacci Retracements (em breve)</li>
      </ul>
      
      <Box sx={{ mt: 4 }}>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
        >
          Voltar para o Dashboard
        </Button>
      </Box>
    </Box>
  );
};

export default TechnicalAnalysis; 