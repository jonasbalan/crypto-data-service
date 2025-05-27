import React, { useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
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

interface SentimentTrend {
  timestamp: number;
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
  volume: number;
}

interface SentimentChartProps {
  data?: any; // Dados de sentimento
  trends?: SentimentTrend[]; // Dados de tendência (opcional)
  loading?: boolean;
  title?: string;
}

const SentimentChart: React.FC<SentimentChartProps> = ({ 
  data, 
  trends = [], 
  loading = false, 
  title = "Tendências de Sentimento" 
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Se não há trends mas há data, criar trends mock
  const chartTrends = trends.length > 0 ? trends : (data ? [
    {
      timestamp: Date.now() - 3600000,
      positive: 0.4,
      negative: 0.3,
      neutral: 0.3,
      averageScore: data.score || 0,
      volume: 100
    },
    {
      timestamp: Date.now(),
      positive: data.sentiment === 'positive' ? 0.6 : 0.4,
      negative: data.sentiment === 'negative' ? 0.5 : 0.3,
      neutral: data.sentiment === 'neutral' ? 0.5 : 0.3,
      averageScore: data.score || 0,
      volume: 150
    }
  ] : []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const chartData = {
    labels: chartTrends.map(trend => formatTimestamp(trend.timestamp)),
    datasets: [
      {
        label: 'Sentimento Positivo',
        data: chartTrends.map(trend => trend.positive * 100),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Sentimento Negativo',
        data: chartTrends.map(trend => trend.negative * 100),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Sentimento Neutro',
        data: chartTrends.map(trend => trend.neutral * 100),
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          },
          afterBody: function(tooltipItems: any[]) {
            if (tooltipItems.length > 0) {
              const index = tooltipItems[0].dataIndex;
              const trend = chartTrends[index];
              return [
                `Score Médio: ${trend.averageScore.toFixed(3)}`,
                `Volume: ${trend.volume} análises`
              ];
            }
            return [];
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
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Percentual (%)'
        },
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
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
  const latestTrend = chartTrends[chartTrends.length - 1];
  const previousTrend = chartTrends[chartTrends.length - 2];
  
  const stats = latestTrend ? {
    currentPositive: (latestTrend.positive * 100).toFixed(1),
    currentNegative: (latestTrend.negative * 100).toFixed(1),
    currentNeutral: (latestTrend.neutral * 100).toFixed(1),
    currentScore: latestTrend.averageScore.toFixed(3),
    scoreChange: previousTrend ? 
      ((latestTrend.averageScore - previousTrend.averageScore) * 100).toFixed(1) : '0',
    totalVolume: chartTrends.reduce((sum, trend) => sum + trend.volume, 0)
  } : null;

  return (
    <Box>
      {/* Estatísticas Resumidas */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="success.main">
                  {stats.currentPositive}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Positivo Atual
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="error.main">
                  {stats.currentNegative}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Negativo Atual
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="warning.main">
                  {stats.currentNeutral}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Neutro Atual
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="primary.main">
                  {stats.currentScore}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score Médio
                </Typography>
                <Typography 
                  variant="caption" 
                  color={parseFloat(stats.scoreChange) >= 0 ? 'success.main' : 'error.main'}
                >
                  {parseFloat(stats.scoreChange) >= 0 ? '+' : ''}{stats.scoreChange}%
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Gráfico Principal */}
      <Card>
        <CardContent>
          <Box sx={{ height: 400, position: 'relative' }}>
            {chartTrends.length > 0 ? (
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%' 
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Nenhum dado de tendência disponível
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      {stats && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Resumo da Análise
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total de Análises:</strong> {stats.totalVolume.toLocaleString('pt-BR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Período:</strong> {chartTrends.length} pontos de dados
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Última Atualização:</strong> {latestTrend ? formatTimestamp(latestTrend.timestamp) : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Tendência:</strong> {
                    parseFloat(stats.scoreChange) > 0.5 ? '📈 Melhorando' :
                    parseFloat(stats.scoreChange) < -0.5 ? '📉 Piorando' : '➡️ Estável'
                  }
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SentimentChart; 