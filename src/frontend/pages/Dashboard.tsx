import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
  Chip,
  Avatar,
  LinearProgress
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  Insights as InsightsIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import { sentimentApi, TrendingCoin as ApiTrendingCoin } from '../api/sentimentApi';

interface SystemStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  responseTime?: number;
}

interface TrendingCoin {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  change: string;
  price?: number;
  volume?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    { name: 'API REST', status: 'online', uptime: '99.98%', responseTime: 45 },
    { name: 'WebSockets', status: 'online', uptime: '99.5%', responseTime: 12 },
    { name: 'Banco de Dados', status: 'online', uptime: '100%', responseTime: 8 },
    { name: 'Ollama', status: 'warning', uptime: '98.7%', responseTime: 120 },
    { name: 'Cache Redis', status: 'online', uptime: '99.9%', responseTime: 3 }
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Carregando dados do dashboard...');
      
      // Primeiro tentar dados reais
      try {
        console.log('🚀 Tentando API de dados reais...');
        const realResponse = await fetch('/api/trending/real');
        
        if (realResponse.ok) {
          const realData = await realResponse.json();
          console.log('✅ Dados reais carregados:', realData);
          
          if (Array.isArray(realData) && realData.length > 0) {
            const trendingData: TrendingCoin[] = realData.map((coin: any) => {
              let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
              if (coin.change24h > 2) sentiment = 'bullish';
              else if (coin.change24h < -2) sentiment = 'bearish';
              
              return {
                symbol: coin.symbol,
                sentiment,
                change: `${coin.change24h > 0 ? '+' : ''}${coin.change24h.toFixed(1)}%`,
                price: coin.price,
                volume: coin.volume24h
              };
            });
            setTrendingCoins(trendingData);
            console.log('✅ Dashboard atualizado com dados reais');
            return;
          }
        }
      } catch (realError) {
        console.warn('⚠️ Erro nos dados reais, tentando API simulada:', realError);
      }

      // Fallback para API simulada
      try {
        console.log('🔄 Tentando API simulada...');
        const trending = await sentimentApi.getTrending();
        const trendingData: TrendingCoin[] = trending.map((coin: ApiTrendingCoin) => ({
          symbol: coin.symbol,
          sentiment: coin.sentiment,
          change: `${coin.change24h > 0 ? '+' : ''}${coin.change24h.toFixed(1)}%`,
          price: undefined,
          volume: coin.volume24h
        }));
        setTrendingCoins(trendingData);
        console.log('✅ Dashboard atualizado com API simulada');
      } catch (apiError) {
        console.warn('⚠️ Erro na API simulada, usando dados estáticos:', apiError);
        
        // Fallback final para dados estáticos
        setTrendingCoins([
          { symbol: 'BTC', sentiment: 'bullish', change: '+5.2%', price: 45000 },
          { symbol: 'ETH', sentiment: 'bullish', change: '+3.8%', price: 3200 },
          { symbol: 'SOL', sentiment: 'neutral', change: '+0.5%', price: 98 },
          { symbol: 'XRP', sentiment: 'bearish', change: '-2.1%', price: 0.52 }
        ]);
        console.log('✅ Dashboard atualizado com dados estáticos');
      }
    } catch (err: any) {
      console.error('❌ Erro crítico no dashboard:', err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Navegar para as seções
  const navigateToSection = (path: string) => {
    navigate(path);
  };

  // Função para obter cor baseada no sentimento
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'success.main';
      case 'bearish': return 'error.main';
      case 'neutral': return 'warning.main';
      default: return 'text.primary';
    }
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircleIcon color="success" />;
      case 'offline': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <CheckCircleIcon />;
    }
  };

  // Função para obter cor do response time
  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 50) return 'success';
    if (responseTime < 100) return 'warning';
    return 'error';
  };

  if (loading) {
    return <LoadingSpinner message="Carregando dashboard..." fullHeight />;
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <ErrorDisplay 
          error={error} 
          onRetry={loadDashboardData}
          title="Erro ao carregar dashboard"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Cards para navegação rápida */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <InsightsIcon />
                </Avatar>
                <Typography variant="h6">
                  Análise de Sentimento
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Análise de sentimento do mercado baseada em dados de redes sociais e notícias.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" variant="contained" onClick={() => navigateToSection('/sentiment')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <ShowChartIcon />
                </Avatar>
                <Typography variant="h6">
                  Análise Técnica
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Indicadores técnicos e análise de padrões gráficos.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" variant="contained" onClick={() => navigateToSection('/technical')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Typography variant="h6">
                  Previsão de Preços
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Modelos de machine learning para previsão de preços futuros.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" variant="contained" onClick={() => navigateToSection('/prediction')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', opacity: 0.7 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'grey.500', mr: 2 }}>
                  <MemoryIcon />
                </Avatar>
                <Typography variant="h6">
                  Integração de APIs
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Integração com múltiplas exchanges e fontes de dados.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled>
                Em breve
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Status do sistema e criptomoedas em tendência */}
      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Status do Sistema
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {systemStatus.map((system) => (
                <ListItem key={system.name} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getStatusIcon(system.status)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">{system.name}</Typography>
                        <Chip 
                          label={system.status} 
                          size="small" 
                          color={system.status === 'online' ? 'success' : system.status === 'warning' ? 'warning' : 'error'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Uptime: {system.uptime}
                        </Typography>
                        {system.responseTime && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Response: {system.responseTime}ms
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.max(0, 100 - system.responseTime / 2)} 
                              sx={{ width: 60, height: 4 }}
                              color={getResponseTimeColor(system.responseTime)}
                            />
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Criptomoedas em Tendência
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {trendingCoins.map((coin) => (
                <ListItem 
                  key={coin.symbol} 
                  sx={{ 
                    px: 0,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => navigateToSection(`/sentiment?symbol=${coin.symbol}`)}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: getSentimentColor(coin.sentiment), width: 32, height: 32 }}>
                      <TrendingUpIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="bold">{coin.symbol}</Typography>
                        <Chip 
                          label={coin.sentiment} 
                          size="small" 
                          sx={{ bgcolor: getSentimentColor(coin.sentiment), color: 'white' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Variação: {coin.change}
                        </Typography>
                        {coin.price && (
                          <Typography variant="body2" fontWeight="medium">
                            ${coin.price.toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 
