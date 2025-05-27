import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Info,
  Timeline,
  Assessment
} from '@mui/icons-material';
import SentimentChart from './charts/SentimentChart';
import { SentimentMetrics } from './SentimentMetrics';
import { PriceSentimentCorrelation } from './charts/PriceSentimentCorrelation';

interface SentimentData {
  timestamp: number;
  symbol: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  source: string;
  text: string;
  price?: number;
}

interface SentimentSummary {
  symbol: string;
  overallSentiment: 'positive' | 'negative' | 'neutral';
  averageScore: number;
  confidence: number;
  totalAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: number;
}

interface SentimentAlert {
  id: string;
  symbol: string;
  type: 'sentiment_shift' | 'extreme_sentiment' | 'volume_spike';
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: number;
}

interface SentimentTrend {
  timestamp: number;
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  volume: number;
}

interface SentimentDashboardProps {
  symbol?: string;
  timeRange?: string;
  onRefresh?: () => void;
}

export const SentimentDashboard: React.FC<SentimentDashboardProps> = ({ 
  symbol: propSymbol, 
  timeRange: propTimeRange, 
  onRefresh 
}) => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [sentimentTrends, setSentimentTrends] = useState<SentimentTrend[]>([]);
  const [sentimentSummary, setSentimentSummary] = useState<SentimentSummary[]>([]);
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(propSymbol || 'BTC');
  const [timeRange, setTimeRange] = useState<string>(propTimeRange || '24h');
  const [showCorrelation, setShowCorrelation] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'LINK', 'UNI'];
  const timeRanges = [
    { value: '1h', label: '1 Hora' },
    { value: '6h', label: '6 Horas' },
    { value: '24h', label: '24 Horas' },
    { value: '7d', label: '7 Dias' },
    { value: '30d', label: '30 Dias' }
  ];

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados de sentimento usando a API correta
      const sentimentResponse = await fetch(
        `/api/sentiment/data?symbols=${selectedSymbol}&limit=100`
      );
      
      if (!sentimentResponse.ok) {
        throw new Error('Erro ao buscar dados de sentimento');
      }

      const sentimentResult = await sentimentResponse.json();
      setSentimentData(sentimentResult.data || []);

      // Buscar métricas de sentimento para todos os símbolos
      const metricsPromises = symbols.map(async (symbol) => {
        const response = await fetch(`/api/sentiment/metrics?symbols=${symbol}`);
        if (response.ok) {
          const result = await response.json();
          const metrics = result.data;
          
          // Converter métricas para formato de resumo
          if (metrics && metrics.bySymbol && metrics.bySymbol[symbol]) {
            const symbolData = metrics.bySymbol[symbol];
            return {
              symbol,
              overallSentiment: symbolData.sentiment,
              averageScore: symbolData.score,
              confidence: 0.8, // Valor padrão
              totalAnalyzed: symbolData.count,
              positiveCount: Math.round(symbolData.count * 0.4), // Estimativa
              negativeCount: Math.round(symbolData.count * 0.3), // Estimativa
              neutralCount: Math.round(symbolData.count * 0.3), // Estimativa
              trend: symbolData.change24h > 0 ? 'up' : symbolData.change24h < 0 ? 'down' : 'stable',
              lastUpdated: Date.now()
            };
          }
        }
        return null;
      });

      const summaries = await Promise.all(metricsPromises);
      setSentimentSummary(summaries.filter(Boolean) as SentimentSummary[]);

      // Buscar tendências de sentimento
      const trendsResponse = await fetch('/api/sentiment/trends?hours=24');
      if (trendsResponse.ok) {
        const trendsResult = await trendsResponse.json();
        setSentimentTrends(trendsResult.data || []);
      }

      // Buscar alertas de sentimento
      const alertsResponse = await fetch('/api/sentiment/alerts');
      if (alertsResponse.ok) {
        const alertsResult = await alertsResponse.json();
        setAlerts(alertsResult.data || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados de sentimento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentimentData();
  }, [selectedSymbol, timeRange]);

  // Atualizar estados quando as props mudarem
  useEffect(() => {
    if (propSymbol && propSymbol !== selectedSymbol) {
      setSelectedSymbol(propSymbol);
    }
  }, [propSymbol]);

  useEffect(() => {
    if (propTimeRange && propTimeRange !== timeRange) {
      setTimeRange(propTimeRange);
    }
  }, [propTimeRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchSentimentData, 30000); // Atualizar a cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedSymbol, timeRange]);

  const getSentimentIcon = (sentiment: string, trend?: string) => {
    if (trend === 'up') return <TrendingUp color="success" />;
    if (trend === 'down') return <TrendingDown color="error" />;
    if (trend === 'stable') return <TrendingFlat color="info" />;
    
    switch (sentiment) {
      case 'positive': return <TrendingUp color="success" />;
      case 'negative': return <TrendingDown color="error" />;
      default: return <TrendingFlat color="info" />;
    }
  };

  const getSentimentColor = (sentiment: string): 'success' | 'error' | 'default' => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'default';
    }
  };

  const getAlertSeverityColor = (severity: string): 'info' | 'warning' | 'error' => {
    return severity as 'info' | 'warning' | 'error';
  };

  if (loading && sentimentData.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Carregando análise de sentimento...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Dashboard de Análise de Sentimento
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Símbolo</InputLabel>
            <Select
              value={selectedSymbol}
              label="Símbolo"
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {symbols.map((symbol) => (
                <MenuItem key={symbol} value={symbol}>
                  {symbol}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={timeRange}
              label="Período"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showCorrelation}
                onChange={(e) => setShowCorrelation(e.target.checked)}
              />
            }
            label="Correlação"
          />

          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto-refresh"
          />

          <Tooltip title="Atualizar dados">
            <IconButton onClick={fetchSentimentData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Alertas de Sentimento */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Alertas de Sentimento
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {alerts.slice(0, 3).map((alert) => (
              <Box key={alert.id} sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Alert 
                  severity={getAlertSeverityColor(alert.severity)}
                  sx={{ height: '100%' }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {alert.symbol}
                  </Typography>
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                </Alert>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Resumo Geral */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumo de Sentimento - Principais Criptomoedas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {sentimentSummary.map((summary) => (
            <Box key={summary.symbol} sx={{ flex: '1 1 250px', minWidth: 250 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6">
                      {summary.symbol}
                    </Typography>
                    {getSentimentIcon(summary.overallSentiment, summary.trend)}
                  </Box>
                  
                  <Chip
                    label={summary.overallSentiment.toUpperCase()}
                    color={getSentimentColor(summary.overallSentiment)}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  
                  <Typography variant="body2" color="text.secondary">
                    Score: {summary.averageScore.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confiança: {(summary.confidence * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Análises: {summary.totalAnalyzed}
                  </Typography>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Chip label={`+${summary.positiveCount}`} color="success" size="small" variant="outlined" />
                    <Chip label={`-${summary.negativeCount}`} color="error" size="small" variant="outlined" />
                    <Chip label={`=${summary.neutralCount}`} color="default" size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Métricas Detalhadas */}
      <SentimentMetrics 
        data={sentimentData}
        symbol={selectedSymbol}
        timeRange={timeRange}
      />

      {/* Gráficos */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
        {/* Gráfico de Tendência de Sentimento */}
        <Box sx={{ flex: showCorrelation ? '1 1 500px' : '1 1 100%', minWidth: 500 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Timeline sx={{ mr: 1 }} />
              <Typography variant="h6">
                Tendência de Sentimento - {selectedSymbol}
              </Typography>
              <Tooltip title="Evolução do sentimento ao longo do tempo">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <SentimentChart 
              trends={sentimentTrends}
              title={`Tendência de Sentimento - ${selectedSymbol}`}
            />
          </Paper>
        </Box>

        {/* Correlação Preço-Sentimento */}
        {showCorrelation && (
          <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Correlação Preço-Sentimento
                </Typography>
                <Tooltip title="Relação entre sentimento e movimento de preços">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <PriceSentimentCorrelation 
                symbol={selectedSymbol}
                timeRange={timeRange}
                height={400}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Dados Recentes */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Análises Recentes - {selectedSymbol}
        </Typography>
        
        {sentimentData.length === 0 ? (
          <Typography color="text.secondary">
            Nenhum dado de sentimento disponível para o período selecionado.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {sentimentData.slice(0, 10).map((item, index) => (
              <Box 
                key={index}
                sx={{ 
                  p: 2, 
                  mb: 1, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  backgroundColor: item.sentiment === 'positive' ? 'success.light' : 
                                 item.sentiment === 'negative' ? 'error.light' : 'grey.100',
                  opacity: 0.8
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getSentimentIcon(item.sentiment)}
                    <Chip 
                      label={item.sentiment.toUpperCase()} 
                      color={getSentimentColor(item.sentiment)}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Score: {item.score.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confiança: {(item.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {item.text.length > 200 ? `${item.text.substring(0, 200)}...` : item.text}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  Fonte: {item.source}
                  {item.price && ` | Preço: $${item.price.toFixed(2)}`}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}; 