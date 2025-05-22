import React from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  Insights as InsightsIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Dados simulados para o dashboard
  const systemStatus = [
    { name: 'API REST', status: 'Online', uptime: '99.98%' },
    { name: 'WebSockets', status: 'Online', uptime: '99.5%' },
    { name: 'Banco de Dados', status: 'Online', uptime: '100%' },
    { name: 'Ollama', status: 'Online', uptime: '98.7%' },
    { name: 'Cache Redis', status: 'Online', uptime: '99.9%' }
  ];

  // Moedas em tendência
  const trendingCoins = [
    { symbol: 'BTC', sentiment: 'bullish', change: '+5.2%' },
    { symbol: 'ETH', sentiment: 'bullish', change: '+3.8%' },
    { symbol: 'SOL', sentiment: 'neutral', change: '+0.5%' },
    { symbol: 'XRP', sentiment: 'bearish', change: '-2.1%' }
  ];

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

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Cards para navegação rápida */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InsightsIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h6">
                  Análise de Sentimento
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Análise de sentimento do mercado baseada em dados de redes sociais e notícias.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigateToSection('/sentiment')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShowChartIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h6">
                  Análise Técnica
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Indicadores técnicos e análise de padrões gráficos.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigateToSection('/technical')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h6">
                  Previsão de Preços
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Modelos de machine learning para previsão de preços futuros.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigateToSection('/prediction')}>
                Acessar
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MemoryIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
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
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status do Sistema
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {systemStatus.map((system) => (
                <ListItem key={system.name}>
                  <ListItemIcon>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: system.status === 'Online' ? 'success.main' : 'error.main' 
                      }} 
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={system.name} 
                    secondary={`Uptime: ${system.uptime}`} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Criptomoedas em Tendência
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {trendingCoins.map((coin) => (
                <ListItem key={coin.symbol}>
                  <ListItemIcon>
                    <TrendingUpIcon 
                      sx={{ 
                        color: getSentimentColor(coin.sentiment) 
                      }} 
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${coin.symbol}`} 
                    secondary={`Sentimento: ${coin.sentiment}, Variação: ${coin.change}`} 
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