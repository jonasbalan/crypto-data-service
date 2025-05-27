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

interface MarketStructureData {
  timestamp: number;
  price: number;
  higherHighs: Array<{ timestamp: number; price: number; strength: number }>;
  lowerLows: Array<{ timestamp: number; price: number; strength: number }>;
  supportLevels: Array<{ price: number; strength: number; touches: number }>;
  resistanceLevels: Array<{ price: number; strength: number; touches: number }>;
  trend: 'uptrend' | 'downtrend' | 'sideways';
  trendStrength: number;
  signals: Array<{
    timestamp: number;
    type: 'buy' | 'sell' | 'neutral';
    strength: number;
    description: string;
    confidence: number;
  }>;
}

interface MarketStructureChartProps {
  data: MarketStructureData[];
  symbol: string;
  timeframe: string;
}

const MarketStructureChart: React.FC<MarketStructureChartProps> = ({
  data,
  symbol,
  timeframe
}) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum dado disponível para Estrutura de Mercado
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

  // Obter todos os níveis de suporte e resistência únicos
  const allSupportLevels = data.flatMap(item => item.supportLevels);
  const allResistanceLevels = data.flatMap(item => item.resistanceLevels);
  
  // Remover duplicatas e ordenar por força
  const uniqueSupports = allSupportLevels
    .filter((level, index, arr) => 
      arr.findIndex(l => Math.abs(l.price - level.price) < 0.01) === index
    )
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Top 3 suportes

  const uniqueResistances = allResistanceLevels
    .filter((level, index, arr) => 
      arr.findIndex(l => Math.abs(l.price - level.price) < 0.01) === index
    )
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Top 3 resistências

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
      // Linhas de suporte
      ...uniqueSupports.map((support, index) => ({
        label: `Suporte ${support.price.toFixed(2)}`,
        data: Array(data.length).fill(support.price),
        borderColor: `rgba(34, 197, 94, ${0.8 - index * 0.2})`,
        backgroundColor: `rgba(34, 197, 94, ${0.1 - index * 0.02})`,
        borderWidth: 2 - index * 0.3,
        fill: false,
        borderDash: [5, 5],
        pointRadius: 0
      })),
      // Linhas de resistência
      ...uniqueResistances.map((resistance, index) => ({
        label: `Resistência ${resistance.price.toFixed(2)}`,
        data: Array(data.length).fill(resistance.price),
        borderColor: `rgba(239, 68, 68, ${0.8 - index * 0.2})`,
        backgroundColor: `rgba(239, 68, 68, ${0.1 - index * 0.02})`,
        borderWidth: 2 - index * 0.3,
        fill: false,
        borderDash: [10, 5],
        pointRadius: 0
      }))
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
          padding: 10,
          filter: function(legendItem: any) {
            // Mostrar apenas preço e os 2 principais níveis de cada tipo
            return legendItem.text === 'Preço' || 
                   legendItem.text.includes('Suporte') && legendItem.datasetIndex <= 3 ||
                   legendItem.text.includes('Resistência') && legendItem.datasetIndex <= 6;
          }
        }
      },
      title: {
        display: true,
        text: `Estrutura de Mercado - ${symbol} (${timeframe})`
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterBody: function(context: any) {
            const dataIndex = context[0].dataIndex;
            const item = data[dataIndex];
            return [
              `Tendência: ${item.trend}`,
              `Força da Tendência: ${(item.trendStrength * 100).toFixed(1)}%`,
              `Higher Highs: ${item.higherHighs.length}`,
              `Lower Lows: ${item.lowerLows.length}`
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
  const totalHigherHighs = data.reduce((sum, item) => sum + item.higherHighs.length, 0);
  const totalLowerLows = data.reduce((sum, item) => sum + item.lowerLows.length, 0);
  const avgTrendStrength = data.reduce((sum, item) => sum + item.trendStrength, 0) / data.length;

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
            <Chip
              label={latestData.trend.toUpperCase()}
              color={
                latestData.trend === 'uptrend' ? 'success' :
                latestData.trend === 'downtrend' ? 'error' : 'default'
              }
              variant="filled"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tendência Atual
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {(latestData.trendStrength * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Força da Tendência
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {totalHigherHighs}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Higher Highs
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {totalLowerLows}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lower Lows
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Níveis de Suporte e Resistência */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {uniqueSupports.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Níveis de Suporte
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {uniqueResistances.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Níveis de Resistência
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {(avgTrendStrength * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Força Média da Tendência
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

      {/* Análise dos Níveis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Análise dos Níveis Chave
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Suportes */}
            <Card variant="outlined" sx={{ minWidth: 300 }}>
              <CardContent>
                <Typography variant="subtitle1" color="success.main" gutterBottom>
                  🟢 Níveis de Suporte
                </Typography>
                {uniqueSupports.slice(0, 3).map((support, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      ${support.price.toFixed(2)} - Força: {(support.strength * 100).toFixed(0)}% 
                      ({support.touches} toques)
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
            
            {/* Resistências */}
            <Card variant="outlined" sx={{ minWidth: 300 }}>
              <CardContent>
                <Typography variant="subtitle1" color="error.main" gutterBottom>
                  🔴 Níveis de Resistência
                </Typography>
                {uniqueResistances.slice(0, 3).map((resistance, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      ${resistance.price.toFixed(2)} - Força: {(resistance.strength * 100).toFixed(0)}% 
                      ({resistance.touches} toques)
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
            
            {/* Estrutura */}
            <Card variant="outlined" sx={{ minWidth: 300 }}>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  📈 Estrutura de Mercado
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Tendência: {latestData.trend}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Força: {(latestData.trendStrength * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  HH/LL Ratio: {totalHigherHighs > 0 ? (totalHigherHighs / (totalLowerLows || 1)).toFixed(2) : '0'}
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

export default MarketStructureChart; 