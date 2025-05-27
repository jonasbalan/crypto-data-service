import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BollingerBandsData {
  timestamp: number;
  price: number;
  upperBand: number;
  lowerBand: number;
  middleBand: number;
  bandwidth: number;
  percentB: number;
  squeeze: boolean;
  signals: Array<{
    timestamp: number;
    type: 'buy' | 'sell' | 'neutral';
    strength: number;
    description: string;
    confidence: number;
  }>;
}

interface BollingerBandsChartProps {
  data: BollingerBandsData[];
  symbol: string;
  timeframe: string;
}

const BollingerBandsChart: React.FC<BollingerBandsChartProps> = ({
  data,
  symbol,
  timeframe
}) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum dado disponível para Bollinger Bands
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

  const chartData = {
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
        pointHoverRadius: 4
      },
      {
        label: 'Banda Superior',
        data: data.map(item => item.upperBand),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        fill: false,
        borderDash: [5, 5],
        pointRadius: 0
      },
      {
        label: 'Banda Inferior',
        data: data.map(item => item.lowerBand),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1,
        fill: false,
        borderDash: [5, 5],
        pointRadius: 0
      },
      {
        label: 'Média Móvel (20)',
        data: data.map(item => item.middleBand),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      }
    ]
  };

  const options = {
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
        text: `Bollinger Bands - ${symbol} (${timeframe})`
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterBody: function(context: any) {
            const dataIndex = context[0].dataIndex;
            const item = data[dataIndex];
            return [
              `Bandwidth: ${(item.bandwidth * 100).toFixed(2)}%`,
              `%B: ${(item.percentB * 100).toFixed(2)}%`,
              `Squeeze: ${item.squeeze ? 'Sim' : 'Não'}`
            ];
          }
        }
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
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Calcular estatísticas
  const latestData = data[data.length - 1];
  const squeezeCount = data.filter(item => item.squeeze).length;

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
              {(latestData.percentB * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              %B Atual
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="secondary">
              {(latestData.bandwidth * 100).toFixed(2)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bandwidth
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {squeezeCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Períodos Squeeze
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Chip
              label={latestData.squeeze ? 'SQUEEZE' : 'NORMAL'}
              color={latestData.squeeze ? 'warning' : 'success'}
              variant="filled"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Estado Atual
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Gráfico */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ height: 400 }}>
            <Line data={chartData} options={options} />
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

export default BollingerBandsChart; 