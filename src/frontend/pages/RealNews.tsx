import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tab,
  Tabs,
  TextField,
  Button,
  Grid,
  Chip
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import RealNewsDisplay from '../components/RealNewsDisplay';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`news-tabpanel-${index}`}
      aria-labelledby={`news-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `news-tab-${index}`,
    'aria-controls': `news-tabpanel-${index}`,
  };
}

const RealNews: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<string | undefined>(undefined);

  const popularSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'LINK', 'MATIC'];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) {
      setActiveSymbol(undefined);
    }
  };

  const handleSearch = () => {
    if (searchSymbol.trim()) {
      setActiveSymbol(searchSymbol.trim().toUpperCase());
      setTabValue(1); // Switch to specific symbol tab
    }
  };

  const handleSymbolClick = (symbol: string) => {
    setActiveSymbol(symbol);
    setSearchSymbol(symbol);
    setTabValue(1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        📰 Notícias de Criptomoedas em Tempo Real
      </Typography>

      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Acompanhe as últimas notícias do mercado cripto com análise automática de sentimento
      </Typography>

      {/* Busca e Símbolos Populares */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Buscar Notícias Específicas
        </Typography>
        
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Digite o símbolo da criptomoeda (ex: BTC, ETH)"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!searchSymbol.trim()}
            >
              Buscar
            </Button>
          </Grid>
        </Grid>

        <Typography variant="body2" gutterBottom>
          📈 Símbolos populares:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {popularSymbols.map((symbol) => (
            <Chip
              key={symbol}
              label={symbol}
              onClick={() => handleSymbolClick(symbol)}
              variant={activeSymbol === symbol ? 'filled' : 'outlined'}
              color={activeSymbol === symbol ? 'primary' : 'default'}
              clickable
            />
          ))}
        </Box>
      </Paper>

      {/* Tabs para diferentes visualizações */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="📊 Mercado Geral" {...a11yProps(0)} />
          <Tab 
            label={activeSymbol ? `🎯 ${activeSymbol}` : '🎯 Específica'} 
            {...a11yProps(1)} 
            disabled={!activeSymbol}
          />
        </Tabs>
      </Paper>

      {/* Conteúdo das Tabs */}
      <TabPanel value={tabValue} index={0}>
        <RealNewsDisplay
          autoRefresh={true}
          refreshInterval={300} // 5 minutos
          maxItems={25}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {activeSymbol && (
          <RealNewsDisplay
            symbol={activeSymbol}
            autoRefresh={true}
            refreshInterval={300} // 5 minutos
            maxItems={20}
          />
        )}
      </TabPanel>

      {/* Informações adicionais */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          ℹ️ Sobre as Notícias
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          • **Fontes**: CoinDesk, Cointelegraph, Decrypt, Bitcoin Magazine, The Block, CryptoNews
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          • **Atualização**: Automática a cada 5 minutos
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          • **Sentimento**: Análise automática usando IA para classificar notícias como positivas, negativas ou neutras
        </Typography>
        <Typography variant="body2">
          • **Cache**: Sistema inteligente para performance otimizada
        </Typography>
      </Paper>
    </Container>
  );
};

export default RealNews; 