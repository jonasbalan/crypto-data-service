import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Dashboard from './pages/Dashboard';
import SentimentAnalysis from './pages/SentimentAnalysis';
import TechnicalAnalysis from './pages/TechnicalAnalysis';
import PricePrediction from './pages/PricePrediction';
import RealNews from './pages/RealNews';
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
          <Route path="/news" element={<RealNews />} />
        </Routes>
      </Layout>
    </Box>
  );
};

export default App; 