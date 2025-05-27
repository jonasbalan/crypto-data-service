import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Chart } from 'react-chartjs-2';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MACDAdvancedData {
  timestamp: number;
  price: number;
  macd: number;
  signal: number;
  histogram: number;
  divergences: {
    bullish: Array<{ timestamp: number; strength: number }>;
    bearish: Array<{ timestamp: number; strength: number }>;
  };
  momentum: 'increasing' | 'decreasing' | 'neutral';
  signals: Array<{
    timestamp: number;
    type: 'buy' | 'sell' | 'neutral';
    strength: number;
    description: string;
    confidence: number;
  }>;
}

interface MACDAdvancedChartProps {
  data: MACDAdvancedData[];
  symbol: string;
  timeframe: string;
}

const MACDAdvancedChart: React.FC<MACDAdvancedChartProps> = ({
  data,
  symbol,
  timeframe
}) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum dado disponível para MACD Avançado
        </Typography>
      </Box>
    );
  }

  // Preparar dados para o gráfico
  const labels = data.map(item => 
    new Date(item.timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  );

  // Gráfico de Preço com Divergências
  const priceChartData = {
    labels,
    datasets: [
      {
        label: 'Preço',
        data: data.map(item => item.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y'
      }
    ]
  };

  // Gráfico MACD
  const macdChartData = {
    labels,
    datasets: [
      {
        label: 'MACD',
        data: data.map(item => item.macd),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        type: 'line' as const
      },
      {
        label: 'Sinal',
        data: data.map(item => item.signal),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        type: 'line' as const
      },
      {
        label: 'Histograma',
        data: data.map(item => item.histogram),
        backgroundColor: data.map(item => 
          item.histogram >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: data.map(item => 
          item.histogram >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
        type: 'bar' as const
      }
    ]
  };

  const priceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: `Preço - ${symbol} (${timeframe})`
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tempo'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Preço (USDT)'
        },
        position: 'left' as const
      }
    }
  };

  const macdOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: `MACD - ${symbol} (${timeframe})`
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tempo'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'MACD'
        }
      }
    }
  };

  // Calcular estatísticas
  const latestData = data[data.length - 1];
  const bullishDivergences = data.reduce((sum, item) => sum + item.divergences.bullish.length, 0);
  const bearishDivergences = data.reduce((sum, item) => sum + item.divergences.bearish.length, 0);
  const crossovers = data.filter((item, index) => {
    if (index === 0) return false;
    const prev = data[index - 1];
    return (item.macd > item.signal && prev.macd <= prev.signal) ||
           (item.macd < item.signal && prev.macd >= prev.signal);
  }).length;

  // Últimos sinais
  const recentSignals = data
    .flatMap(item => item.signals)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  return (
    <Box>
      {/* Estatísticas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {latestData.macd.toFixed(4)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MACD Atual
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="secondary">
              {latestData.signal.toFixed(4)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sinal Atual
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color={latestData.histogram >= 0 ? 'success.main' : 'error.main'}>
              {latestData.histogram.toFixed(4)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Histograma
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Chip
              label={latestData.momentum.toUpperCase()}
              color={
                latestData.momentum === 'increasing' ? 'success' :
                latestData.momentum === 'decreasing' ? 'error' : 'default'
              }
              variant="filled"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Momentum
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Divergências */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {bullishDivergences}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Divergências Bullish
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {bearishDivergences}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Divergências Bearish
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {crossovers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cruzamentos
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Gráfico de Preço */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ height: 300 }}>
            <Line data={priceChartData} options={priceOptions} />
          </Box>
        </CardContent>
      </Card>

      {/* Gráfico MACD */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ height: 300 }}>
            <Chart type="bar" data={macdChartData} options={macdOptions} />
          </Box>
        </CardContent>
      </Card>

      {/* Sinais Recentes */}
      {recentSignals.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Sinais Recentes
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {recentSignals.map((signal, index) => (
                <Card variant="outlined" key={index} sx={{ minWidth: 250 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={signal.type.toUpperCase()}
                        color={
                          signal.type === 'buy' ? 'success' :
                          signal.type === 'sell' ? 'error' : 'default'
                        }
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(signal.timestamp).toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" gutterBottom>
                      {signal.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Força: {(signal.strength * 100).toFixed(0)}% | 
                      Confiança: {(signal.confidence * 100).toFixed(0)}%
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MACDAdvancedChart; 