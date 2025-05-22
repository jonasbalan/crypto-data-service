import React from 'react';
import { Box, Typography, Alert, AlertTitle, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PricePrediction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Previsão de Preços
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Em Desenvolvimento</AlertTitle>
        Esta funcionalidade está em desenvolvimento. O modelo LSTM para previsão de preços já está 
        implementado no backend, mas a interface de usuário ainda está sendo construída.
      </Alert>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Modelos Implementados
        </Typography>
        
        <Typography variant="body1" paragraph>
          O sistema utiliza os seguintes modelos de machine learning para previsão de preços:
        </Typography>
        
        <ul>
          <li>LSTM (Long Short-Term Memory) - Principal modelo em uso</li>
          <li>Regressão Linear (como baseline para comparação)</li>
        </ul>
        
        <Typography variant="body1" paragraph sx={{ mt: 2 }}>
          Métricas de avaliação dos modelos:
        </Typography>
        
        <ul>
          <li>MSE (Mean Squared Error)</li>
          <li>MAE (Mean Absolute Error)</li>
          <li>MAPE (Mean Absolute Percentage Error)</li>
          <li>R² (Coeficiente de Determinação)</li>
        </ul>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Próximas Implementações
        </Typography>
        
        <ul>
          <li>Interface para visualização de previsões</li>
          <li>Gráficos comparativos entre valores reais e previstos</li>
          <li>Configuração de parâmetros de previsão</li>
          <li>Modelos adicionais (CNN, GRU, Ensemble)</li>
          <li>Integração com análise de sentimento para previsões combinadas</li>
        </ul>
      </Paper>
      
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

export default PricePrediction; 