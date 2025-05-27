import React from 'react';
import { Container, Box } from '@mui/material';
import { SentimentDashboard as SentimentDashboardComponent } from '../components/SentimentDashboard';

const SentimentDashboard: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <SentimentDashboardComponent />
    </Container>
  );
};

export default SentimentDashboard; 