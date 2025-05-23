import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Autocomplete, 
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Fab
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { sentimentApi, SentimentResult, SentimentSummary } from '../api/sentimentApi';
import SentimentChart from '../components/charts/SentimentChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

// Lista de símbolos de criptomoedas populares
const popularCoins = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOT', 'DOGE', 'AVAX', 'MATIC', 'LINK'];

const SentimentAnalysis: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTC');
  const [sentimentData, setSentimentData] = useState<SentimentResult | null>(null);
  const [summaryData, setSummaryData] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados de sentimento quando o símbolo mudar
  useEffect(() => {
    if (symbol) {
      fetchSentimentData(symbol);
    }
  }, [symbol]);

  // Função para buscar dados de sentimento
  const fetchSentimentData = async (coinSymbol: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar análise de sentimento e resumo em paralelo
      const [analysis, summary] = await Promise.all([
        sentimentApi.getAnalysis(coinSymbol),
        sentimentApi.getSummary(coinSymbol)
      ]);
      
      setSentimentData(analysis);
      setSummaryData(summary);
    } catch (err: any) {
      console.error('Erro ao buscar dados de sentimento:', err);
      setError(`Erro ao buscar dados: ${err.message || 'Desconhecido'}`);
      setSentimentData(null);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com a busca
  const handleSearch = () => {
    if (symbol) {
      fetchSentimentData(symbol);
    }
  };

  // Função para determinar a cor com base na recomendação
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'comprar': return 'success.main';
      case 'vender': return 'error.main';
      case 'manter': return 'warning.main';
      default: return 'text.primary';
    }
  };

  if (loading && !sentimentData) {
    return <LoadingSpinner message="Analisando sentimento do mercado..." fullHeight />;
  }

  return (
    <Box sx={{ py: 2, position: 'relative' }}>
      <Typography variant="h4" gutterBottom>
        Análise de Sentimento de Mercado
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Autocomplete
          value={symbol}
          onChange={(_, newValue) => newValue && setSymbol(newValue)}
          options={popularCoins}
          renderInput={(params) => 
            <TextField 
              {...params} 
              label="Símbolo da Criptomoeda" 
              variant="outlined" 
              fullWidth 
            />
          }
          sx={{ width: { xs: '100%', sm: 300 } }}
          freeSolo
        />
        <Button 
          variant="contained" 
          onClick={handleSearch}
          disabled={loading || !symbol}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Analisar'}
        </Button>
      </Box>

      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={() => fetchSentimentData(symbol)}
          title="Erro na análise de sentimento"
        />
      )}

      {sentimentData && (
        <>
          <SentimentChart data={sentimentData} loading={loading} />
          
          {summaryData && (
            <Card sx={{ mt: 4, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Recomendação de Investimento
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: getRecommendationColor(summaryData.overallRecommendation),
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      mb: 1
                    }}
                  >
                    {summaryData.overallRecommendation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confiança: {summaryData.confidence}%
                  </Typography>
                </Box>
                
                <Typography variant="body1" paragraph sx={{ textAlign: 'center', mb: 3 }}>
                  {summaryData.reasonSummary}
                </Typography>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-around', 
                  mt: 3,
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Score de Sentimento
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {summaryData.sentimentScore.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Score Técnico
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {summaryData.technicalScore.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Botão flutuante para atualizar */}
      <Fab
        color="primary"
        aria-label="refresh"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => fetchSentimentData(symbol)}
        disabled={loading}
      >
        <RefreshIcon />
      </Fab>
    </Box>
  );
};

export default SentimentAnalysis; 