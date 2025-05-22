import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Dashboard from './pages/Dashboard';
import SentimentAnalysis from './pages/SentimentAnalysis';
import TechnicalAnalysis from './pages/TechnicalAnalysis';
import PricePrediction from './pages/PricePrediction';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sentiment" element={<SentimentAnalysis />} />
          <Route path="/technical" element={<TechnicalAnalysis />} />
          <Route path="/prediction" element={<PricePrediction />} />
        </Routes>
      </Layout>
    </Box>
  );
};

export default App; 