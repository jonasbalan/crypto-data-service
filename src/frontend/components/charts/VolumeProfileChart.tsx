import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VolumeProfileData {
  priceLevel: number;
  volume: number;
  percentage: number;
  isPOC: boolean;
  isValueArea: boolean;
  signals: Array<{
    timestamp: number;
    type: 'buy' | 'sell' | 'neutral';
    strength: number;
    description: string;
    confidence: number;
  }>;
}

interface VolumeProfileChartProps {
  data: VolumeProfileData[];
  symbol: string;
  timeframe: string;
}

const VolumeProfileChart: React.FC<VolumeProfileChartProps> = ({
  data,
  symbol,
  timeframe
}) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum dado disponível para Volume Profile
        </Typography>
      </Box>
    );
  }

  // Ordenar dados por nível de preço
  const sortedData = [...data].sort((a, b) => b.priceLevel - a.priceLevel);

  // Preparar dados para o gráfico
  const labels = sortedData.map(item => item.priceLevel.toFixed(2));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Volume',
        data: sortedData.map(item => item.volume),
        backgroundColor: sortedData.map(item => {
          if (item.isPOC) return 'rgba(255, 193, 7, 0.8)'; // Amarelo para POC
          if (item.isValueArea) return 'rgba(33, 150, 243, 0.6)'; // Azul para Value Area
          return 'rgba(158, 158, 158, 0.4)'; // Cinza para outros
        }),
        borderColor: sortedData.map(item => {
          if (item.isPOC) return 'rgb(255, 193, 7)';
          if (item.isValueArea) return 'rgb(33, 150, 243)';
          return 'rgb(158, 158, 158)';
        }),
        borderWidth: 1
      }
    ]
  };

  const options = {
    indexAxis: 'y' as const,
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
        text: `Volume Profile - ${symbol} (${timeframe})`
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const dataIndex = context.dataIndex;
            const item = sortedData[dataIndex];
            return [
              `Volume: ${item.volume.toLocaleString()}`,
              `Percentual: ${item.percentage.toFixed(2)}%`,
              `POC: ${item.isPOC ? 'Sim' : 'Não'}`,
              `Value Area: ${item.isValueArea ? 'Sim' : 'Não'}`
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
          text: 'Volume'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Nível de Preço (USDT)'
        }
      }
    }
  };

  // Calcular estatísticas
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  const pocData = sortedData.find(item => item.isPOC);
  const valueAreaData = sortedData.filter(item => item.isValueArea);
  const valueAreaVolume = valueAreaData.reduce((sum, item) => sum + item.volume, 0);
  const valueAreaPercentage = (valueAreaVolume / totalVolume) * 100;

  // Últimos sinais
  const recentSignals = sortedData
    .flatMap(item => item.signals)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  return (
    <Box>
      {/* Estatísticas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              ${pocData?.priceLevel.toFixed(2) || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              POC (Point of Control)
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {totalVolume.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Volume Total
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {valueAreaPercentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Value Area (70%)
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="secondary">
              {valueAreaData.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Níveis Value Area
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Legenda */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Chip
          label="POC - Point of Control"
          sx={{ backgroundColor: 'rgba(255, 193, 7, 0.8)', color: 'black' }}
        />
        <Chip
          label="Value Area (70% do volume)"
          sx={{ backgroundColor: 'rgba(33, 150, 243, 0.6)', color: 'white' }}
        />
        <Chip
          label="Outros níveis"
          sx={{ backgroundColor: 'rgba(158, 158, 158, 0.4)', color: 'black' }}
        />
      </Box>

      {/* Gráfico */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ height: 500 }}>
            <Bar data={chartData} options={options} />
          </Box>
        </CardContent>
      </Card>

      {/* Análise dos Níveis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Análise dos Níveis de Volume
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {pocData && (
              <Card variant="outlined" sx={{ minWidth: 250 }}>
                <CardContent>
                  <Typography variant="subtitle1" color="warning.main" gutterBottom>
                    🎯 Point of Control (POC)
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Preço: ${pocData.priceLevel.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Volume: {pocData.volume.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Percentual: {pocData.percentage.toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            <Card variant="outlined" sx={{ minWidth: 250 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  📈 Value Area
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Níveis: {valueAreaData.length}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Volume: {valueAreaVolume.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  Percentual: {valueAreaPercentage.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ minWidth: 250 }}>
              <CardContent>
                <Typography variant="subtitle1" color="secondary" gutterBottom>
                  📊 Distribuição
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Níveis totais: {sortedData.length}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Maior volume: {Math.max(...sortedData.map(d => d.volume)).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  Menor volume: {Math.min(...sortedData.map(d => d.volume)).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
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

export default VolumeProfileChart; 