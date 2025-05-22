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
  Alert,
  AlertTitle
} from '@mui/material';
import { sentimentApi, SentimentResult, SentimentSummary } from '../api/sentimentApi';
import SentimentChart from '../components/charts/SentimentChart';

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

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Análise de Sentimento de Mercado
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 4, gap: 2 }}>
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
          sx={{ width: 300 }}
          freeSolo
        />
        <Button 
          variant="contained" 
          onClick={handleSearch}
          disabled={loading || !symbol}
        >
          {loading ? <CircularProgress size={24} /> : 'Analisar'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Erro</AlertTitle>
          {error}
        </Alert>
      )}

      {!loading && sentimentData && (
        <>
          <SentimentChart data={sentimentData} loading={loading} />
          
          {summaryData && (
            <Card sx={{ mt: 4 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Recomendação de Investimento
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: getRecommendationColor(summaryData.overallRecommendation),
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {summaryData.overallRecommendation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confiança: {summaryData.confidence}%
                  </Typography>
                </Box>
                
                <Typography variant="body1" paragraph>
                  {summaryData.reasonSummary}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Typography variant="body2">
                    Score de Sentimento: <strong>{summaryData.sentimentScore.toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Score Técnico: <strong>{summaryData.technicalScore.toFixed(2)}</strong>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default SentimentAnalysis; 