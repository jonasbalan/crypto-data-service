import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Grid
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Settings,
  Info,
  Timeline,
  BarChart,
  ShowChart,
  Assessment
} from '@mui/icons-material';
import BollingerBandsChart from '../components/charts/BollingerBandsChart';
import MACDAdvancedChart from '../components/charts/MACDAdvancedChart';
import VolumeProfileChart from '../components/charts/VolumeProfileChart';
import MarketStructureChart from '../components/charts/MarketStructureChart';
import IndicatorSignalsPanel from '../components/IndicatorSignalsPanel';
import IndicatorComparison from '../components/IndicatorComparison';

interface AdvancedIndicatorsData {
  bollingerBands: any;
  macdAdvanced: any;
  volumeProfile: any[];
  marketStructure: any;
  overallSignal: {
    direction: 'buy' | 'sell' | 'neutral';
    strength: number;
    confidence: number;
    reasoning: string[];
  };
}

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
      id={`indicator-tabpanel-${index}`}
      aria-labelledby={`indicator-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TechnicalIndicatorsDashboard: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1d');
  const [data, setData] = useState<AdvancedIndicatorsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT',
    'LINKUSDT', 'BNBUSDT', 'SOLUSDT', 'MATICUSDT'
  ];

  const timeframes = [
    { value: '1m', label: '1 Minuto' },
    { value: '5m', label: '5 Minutos' },
    { value: '15m', label: '15 Minutos' },
    { value: '1h', label: '1 Hora' },
    { value: '4h', label: '4 Horas' },
    { value: '1d', label: '1 Dia' }
  ];

  const fetchIndicatorsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/advanced-indicators/analysis/${selectedSymbol}?timeframe=${timeframe}&limit=200`
      );

      if (!response.ok) {
        throw new Error('Falha ao carregar dados dos indicadores');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados dos indicadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicatorsData();
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchIndicatorsData, 30000); // 30 segundos
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getSignalColor = (direction: string) => {
    switch (direction) {
      case 'buy': return 'success';
      case 'sell': return 'error';
      default: return 'default';
    }
  };

  const getSignalIcon = (direction: string) => {
    switch (direction) {
      case 'buy': return <TrendingUp />;
      case 'sell': return <TrendingDown />;
      default: return <TrendingFlat />;
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📊 Indicadores Técnicos Avançados
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Análise completa com Bollinger Bands, MACD, Volume Profile e Estrutura de Mercado
        </Typography>
      </Box>

      {/* Controles */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Criptomoeda</InputLabel>
                <Select
                  value={selectedSymbol}
                  label="Criptomoeda"
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                >
                  {symbols.map((symbol) => (
                    <MenuItem key={symbol} value={symbol}>
                      {symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={timeframe}
                  label="Timeframe"
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  {timeframes.map((tf) => (
                    <MenuItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchIndicatorsData}
                disabled={loading}
                fullWidth
              >
                Atualizar
              </Button>
            </Grid>

            <Grid item xs={12} md={2}>
              <Tooltip title="Configurações avançadas">
                <IconButton>
                  <Settings />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sinal Geral */}
      {data && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">Sinal Geral:</Typography>
                  <Chip
                    icon={getSignalIcon(data.overallSignal.direction)}
                    label={data.overallSignal.direction.toUpperCase()}
                    color={getSignalColor(data.overallSignal.direction) as any}
                    variant="filled"
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Força: {formatPercentage(data.overallSignal.strength)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Confiança: {formatPercentage(data.overallSignal.confidence)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <Tooltip title={data.overallSignal.reasoning.join(', ')}>
                  <IconButton>
                    <Info />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs de Indicadores */}
      {data && (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="indicator tabs">
              <Tab
                icon={<ShowChart />}
                label="Bollinger Bands"
                id="indicator-tab-0"
                aria-controls="indicator-tabpanel-0"
              />
              <Tab
                icon={<Timeline />}
                label="MACD Avançado"
                id="indicator-tab-1"
                aria-controls="indicator-tabpanel-1"
              />
              <Tab
                icon={<BarChart />}
                label="Volume Profile"
                id="indicator-tab-2"
                aria-controls="indicator-tabpanel-2"
              />
              <Tab
                icon={<Assessment />}
                label="Estrutura de Mercado"
                id="indicator-tab-3"
                aria-controls="indicator-tabpanel-3"
              />
              <Tab
                icon={<TrendingUp />}
                label="Sinais"
                id="indicator-tab-4"
                aria-controls="indicator-tabpanel-4"
              />
              <Tab
                icon={<Settings />}
                label="Comparação"
                id="indicator-tab-5"
                aria-controls="indicator-tabpanel-5"
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <BollingerBandsChart
              data={data.bollingerBands}
              symbol={selectedSymbol}
              timeframe={timeframe}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <MACDAdvancedChart
              data={data.macdAdvanced}
              symbol={selectedSymbol}
              timeframe={timeframe}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <VolumeProfileChart
              data={data.volumeProfile}
              symbol={selectedSymbol}
              timeframe={timeframe}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <MarketStructureChart
              data={data.marketStructure}
              symbol={selectedSymbol}
              timeframe={timeframe}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <IndicatorSignalsPanel
              bollingerSignals={data.bollingerBands.signals}
              macdSignals={data.macdAdvanced.signals}
              structureSignals={data.marketStructure.signals}
              symbol={selectedSymbol}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <IndicatorComparison
              currentSymbol={selectedSymbol}
              timeframe={timeframe}
            />
          </TabPanel>
        </Card>
      )}

      {/* Informações Educativas */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📚 Sobre os Indicadores
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Bollinger Bands:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Indicam volatilidade e possíveis reversões. Squeeze indica baixa volatilidade 
                seguida de breakout. %B mostra posição do preço nas bandas.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>MACD Avançado:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detecta divergências entre preço e momentum. Cruzamentos da linha de sinal 
                indicam mudanças de tendência.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Volume Profile:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mostra distribuição de volume por nível de preço. POC (Point of Control) 
                indica maior atividade de negociação.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Estrutura de Mercado:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Identifica tendências através de Higher Highs/Lower Lows e níveis de 
                suporte/resistência baseados em toques múltiplos.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TechnicalIndicatorsDashboard; 
