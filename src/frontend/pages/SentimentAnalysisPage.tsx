import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  Assessment,
  Psychology,
  NavigateNext
} from '@mui/icons-material';
import { SentimentDashboard } from '../components/SentimentDashboard';

const SentimentAnalysisPage: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeRange, setTimeRange] = useState('24h');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const symbols = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'BNB', label: 'Binance Coin (BNB)' },
    { value: 'ADA', label: 'Cardano (ADA)' },
    { value: 'SOL', label: 'Solana (SOL)' },
    { value: 'DOT', label: 'Polkadot (DOT)' },
    { value: 'MATIC', label: 'Polygon (MATIC)' },
    { value: 'AVAX', label: 'Avalanche (AVAX)' }
  ];

  const timeRanges = [
    { value: '1h', label: '1 Hora' },
    { value: '6h', label: '6 Horas' },
    { value: '24h', label: '24 Horas' },
    { value: '7d', label: '7 Dias' },
    { value: '30d', label: '30 Dias' }
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simular atualização
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSymbolChange = (event: any) => {
    setSelectedSymbol(event.target.value);
  };

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
  };

  useEffect(() => {
    // Auto-refresh a cada 5 minutos
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Psychology sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Análise de Sentimento - Crypto Data Service
          </Typography>
          <Chip 
            label={`Última atualização: ${lastUpdate.toLocaleTimeString('pt-BR')}`}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<NavigateNext fontSize="small" />} 
          sx={{ mb: 3 }}
        >
          <Link color="inherit" href="/">
            Dashboard
          </Link>
          <Typography color="text.primary">Análise de Sentimento</Typography>
        </Breadcrumbs>

        {/* Controles */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Criptomoeda</InputLabel>
                <Select
                  value={selectedSymbol}
                  label="Criptomoeda"
                  onChange={handleSymbolChange}
                >
                  {symbols.map((symbol) => (
                    <MenuItem key={symbol.value} value={symbol.value}>
                      {symbol.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={timeRange}
                  label="Período"
                  onChange={handleTimeRangeChange}
                >
                  {timeRanges.map((range) => (
                    <MenuItem key={range.value} value={range.value}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Análise em tempo real
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Informações sobre a análise */}
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          icon={<TrendingUp />}
        >
          <Typography variant="body2">
            <strong>Análise de Sentimento:</strong> Esta página apresenta análises de sentimento 
            em tempo real baseadas em notícias, redes sociais e feeds RSS. Os dados são processados 
            usando modelos de IA para identificar tendências de mercado e correlações com preços.
          </Typography>
        </Alert>

        {/* Dashboard Principal */}
        <SentimentDashboard 
          symbol={selectedSymbol}
          timeRange={timeRange}
          onRefresh={handleRefresh}
        />

        {/* Informações Adicionais */}
        <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sobre a Análise de Sentimento
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" paragraph>
                <strong>Fontes de Dados:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • Notícias de fontes confiáveis (CoinDesk, CoinTelegraph, etc.)<br/>
                • Posts do Twitter/X de influenciadores crypto<br/>
                • Feeds RSS de exchanges e plataformas<br/>
                • Fóruns especializados (Reddit, BitcoinTalk)<br/>
                • Relatórios de análise técnica
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body1" paragraph>
                <strong>Metodologia:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • Processamento de linguagem natural (NLP)<br/>
                • Análise de sentimento com IA<br/>
                • Correlação com dados de preço<br/>
                • Ponderação por relevância e credibilidade<br/>
                • Atualização em tempo real
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default SentimentAnalysisPage; 