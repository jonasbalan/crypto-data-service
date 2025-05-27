import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  Grid
} from '@mui/material';
import { Compare, TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface ComparisonData {
  symbol: string;
  overallSignal: {
    direction: 'buy' | 'sell' | 'neutral';
    strength: number;
    confidence: number;
  };
  indicators: {
    bollinger?: {
      squeeze: boolean;
      percentB: number;
      bandwidth: number;
      signalCount: number;
    };
    macd?: {
      histogram: number;
      divergence: string;
      momentum: number;
      signalCount: number;
    };
    structure?: {
      trend: string;
      trendStrength: number;
      supportLevels: number;
      resistanceLevels: number;
      signalCount: number;
    };
  };
}

interface IndicatorComparisonProps {
  currentSymbol: string;
  timeframe: string;
}

const IndicatorComparison: React.FC<IndicatorComparisonProps> = ({
  currentSymbol,
  timeframe
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([currentSymbol]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['bollinger', 'macd', 'structure']);
  const [comparisonData, setComparisonData] = useState<{ [key: string]: ComparisonData }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSymbols = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT',
    'LINKUSDT', 'BNBUSDT', 'SOLUSDT', 'MATICUSDT'
  ];

  const availableIndicators = [
    { value: 'bollinger', label: 'Bollinger Bands' },
    { value: 'macd', label: 'MACD Avançado' },
    { value: 'structure', label: 'Estrutura de Mercado' }
  ];

  const fetchComparisonData = async () => {
    if (selectedSymbols.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/advanced-indicators/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbols: selectedSymbols,
          timeframe,
          indicators: selectedIndicators
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar dados de comparação');
      }

      const result = await response.json();
      setComparisonData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados de comparação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSymbols.length > 0) {
      fetchComparisonData();
    }
  }, [selectedSymbols, selectedIndicators, timeframe]);

  const handleSymbolToggle = (symbol: string) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
  };

  const handleIndicatorToggle = (indicator: string) => {
    setSelectedIndicators(prev => {
      if (prev.includes(indicator)) {
        return prev.filter(i => i !== indicator);
      } else {
        return [...prev, indicator];
      }
    });
  };

  const getSignalIcon = (direction: string) => {
    switch (direction) {
      case 'buy': return <TrendingUp color="success" />;
      case 'sell': return <TrendingDown color="error" />;
      default: return <TrendingFlat color="disabled" />;
    }
  };

  const getSignalColor = (direction: string) => {
    switch (direction) {
      case 'buy': return 'success';
      case 'sell': return 'error';
      default: return 'default';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <Box>
      {/* Controles de Seleção */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ⚙️ Configurações de Comparação
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Seleção de Símbolos */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Criptomoedas para Comparar:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableSymbols.map(symbol => (
                  <FormControlLabel
                    key={symbol}
                    control={
                      <Checkbox
                        checked={selectedSymbols.includes(symbol)}
                        onChange={() => handleSymbolToggle(symbol)}
                        size="small"
                      />
                    }
                    label={symbol}
                  />
                ))}
              </Box>
            </Box>

            {/* Seleção de Indicadores */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Indicadores para Incluir:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableIndicators.map(indicator => (
                  <FormControlLabel
                    key={indicator.value}
                    control={
                      <Checkbox
                        checked={selectedIndicators.includes(indicator.value)}
                        onChange={() => handleIndicatorToggle(indicator.value)}
                        size="small"
                      />
                    }
                    label={indicator.label}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Compare />}
              onClick={fetchComparisonData}
              disabled={loading || selectedSymbols.length === 0}
            >
              Comparar Indicadores
            </Button>
          </Box>
        </CardContent>
      </Card>

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

      {/* Tabela de Comparação */}
      {Object.keys(comparisonData).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Comparação de Indicadores
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Símbolo</strong></TableCell>
                    <TableCell align="center"><strong>Sinal Geral</strong></TableCell>
                    <TableCell align="center"><strong>Força</strong></TableCell>
                    <TableCell align="center"><strong>Confiança</strong></TableCell>
                    {selectedIndicators.includes('bollinger') && (
                      <>
                        <TableCell align="center"><strong>BB Squeeze</strong></TableCell>
                        <TableCell align="center"><strong>BB %B</strong></TableCell>
                      </>
                    )}
                    {selectedIndicators.includes('macd') && (
                      <>
                        <TableCell align="center"><strong>MACD Hist</strong></TableCell>
                        <TableCell align="center"><strong>MACD Div</strong></TableCell>
                      </>
                    )}
                    {selectedIndicators.includes('structure') && (
                      <>
                        <TableCell align="center"><strong>Tendência</strong></TableCell>
                        <TableCell align="center"><strong>Força Tend</strong></TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(comparisonData).map(([symbol, data]) => (
                    <TableRow key={symbol} hover>
                      <TableCell>
                        <Typography variant="subtitle2" color="primary">
                          {symbol}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {getSignalIcon(data.overallSignal.direction)}
                          <Chip
                            label={data.overallSignal.direction.toUpperCase()}
                            color={getSignalColor(data.overallSignal.direction) as any}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatPercentage(data.overallSignal.strength)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatPercentage(data.overallSignal.confidence)}
                        </Typography>
                      </TableCell>

                      {selectedIndicators.includes('bollinger') && (
                        <>
                          <TableCell align="center">
                            <Chip
                              label={data.indicators.bollinger?.squeeze ? 'SIM' : 'NÃO'}
                              color={data.indicators.bollinger?.squeeze ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {data.indicators.bollinger?.percentB ? 
                                formatPercentage(data.indicators.bollinger.percentB) : 'N/A'}
                            </Typography>
                          </TableCell>
                        </>
                      )}

                      {selectedIndicators.includes('macd') && (
                        <>
                          <TableCell align="center">
                            <Typography variant="body2" color={
                              (data.indicators.macd?.histogram || 0) >= 0 ? 'success.main' : 'error.main'
                            }>
                              {data.indicators.macd?.histogram?.toFixed(4) || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={data.indicators.macd?.divergence || 'NONE'}
                              color={
                                data.indicators.macd?.divergence === 'bullish' ? 'success' :
                                data.indicators.macd?.divergence === 'bearish' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </>
                      )}

                      {selectedIndicators.includes('structure') && (
                        <>
                          <TableCell align="center">
                            <Chip
                              label={data.indicators.structure?.trend?.toUpperCase() || 'N/A'}
                              color={
                                data.indicators.structure?.trend === 'uptrend' ? 'success' :
                                data.indicators.structure?.trend === 'downtrend' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {data.indicators.structure?.trendStrength ? 
                                formatPercentage(data.indicators.structure.trendStrength) : 'N/A'}
                            </Typography>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumo da Comparação */}
      {Object.keys(comparisonData).length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 Resumo da Comparação
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {Object.values(comparisonData).filter(d => d.overallSignal.direction === 'buy').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sinais de Compra
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {Object.values(comparisonData).filter(d => d.overallSignal.direction === 'sell').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sinais de Venda
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      {Object.values(comparisonData).filter(d => d.overallSignal.direction === 'neutral').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sinais Neutros
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default IndicatorComparison; 