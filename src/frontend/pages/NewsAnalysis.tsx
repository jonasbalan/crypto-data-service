import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import { Article } from '@mui/icons-material';
import RealNewsDisplay from '../components/RealNewsDisplay';

const NewsAnalysis: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Article />
          Análise de Notícias
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Acompanhe as últimas notícias do mercado de criptomoedas e sua análise de sentimento em tempo real.
        </Typography>
      </Box>

      <RealNewsDisplay />
    </Container>
  );
};

export default NewsAnalysis; 