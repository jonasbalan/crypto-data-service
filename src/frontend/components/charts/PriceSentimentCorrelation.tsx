import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface SentimentData {
  timestamp: number;
  score: number;
  confidence: number;
}

interface CorrelationData {
  timestamp: number;
  price: number;
  sentiment: number;
  priceChange: number;
  sentimentChange: number;
}

interface PriceSentimentCorrelationProps {
  symbol: string;
  timeRange: string;
  height?: number;
}

export const PriceSentimentCorrelation: React.FC<PriceSentimentCorrelationProps> = ({
  symbol,
  timeRange,
  height = 300
}) => {
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correlationCoefficient, setCorrelationCoefficient] = useState<number>(0);

  useEffect(() => {
    fetchCorrelationData();
  }, [symbol, timeRange]);

  const fetchCorrelationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados de preço
      const priceResponse = await fetch(
        `/api/real/price/${symbol}?timeRange=${timeRange}&limit=100`
      );
      
      if (!priceResponse.ok) {
        throw new Error('Erro ao buscar dados de preço');
      }

      const priceResult = await priceResponse.json();
      const priceData: PriceData[] = priceResult.data || [];

      // Buscar dados de sentimento
      const sentimentResponse = await fetch(
        `/api/sentiment/analysis/${symbol}?timeRange=${timeRange}&limit=100`
      );
      
      if (!sentimentResponse.ok) {
        throw new Error('Erro ao buscar dados de sentimento');
      }

      const sentimentResult = await sentimentResponse.json();
      const sentimentData: SentimentData[] = sentimentResult.data || [];

      // Combinar e processar dados
      const combinedData = combineAndProcessData(priceData, sentimentData);
      setCorrelationData(combinedData);

      // Calcular coeficiente de correlação
      const correlation = calculateCorrelation(combinedData);
      setCorrelationCoefficient(correlation);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados de correlação:', err);
    } finally {
      setLoading(false);
    }
  };

  const combineAndProcessData = (priceData: PriceData[], sentimentData: SentimentData[]): CorrelationData[] => {
    if (priceData.length === 0 || sentimentData.length === 0) {
      return [];
    }

    // Agrupar dados por intervalos de tempo
    const getTimeInterval = (timeRange: string) => {
      switch (timeRange) {
        case '1h': return 5 * 60 * 1000; // 5 minutos
        case '6h': return 30 * 60 * 1000; // 30 minutos
        case '24h': return 60 * 60 * 1000; // 1 hora
        case '7d': return 6 * 60 * 60 * 1000; // 6 horas
        case '30d': return 24 * 60 * 60 * 1000; // 1 dia
        default: return 60 * 60 * 1000; // 1 hora
      }
    };

    const interval = getTimeInterval(timeRange);
    const combinedMap: { [key: string]: { prices: number[], sentiments: number[] } } = {};

    // Agrupar dados de preço
    priceData.forEach(item => {
      const timeKey = Math.floor(item.timestamp / interval) * interval;
      const timeKeyStr = timeKey.toString();
      
      if (!combinedMap[timeKeyStr]) {
        combinedMap[timeKeyStr] = { prices: [], sentiments: [] };
      }
      combinedMap[timeKeyStr].prices.push(item.price);
    });

    // Agrupar dados de sentimento
    sentimentData.forEach(item => {
      const timeKey = Math.floor(item.timestamp / interval) * interval;
      const timeKeyStr = timeKey.toString();
      
      if (!combinedMap[timeKeyStr]) {
        combinedMap[timeKeyStr] = { prices: [], sentiments: [] };
      }
      combinedMap[timeKeyStr].sentiments.push(item.score);
    });

    // Processar dados combinados
    const result: CorrelationData[] = [];
    const sortedKeys = Object.keys(combinedMap).sort((a, b) => parseInt(a) - parseInt(b));

    for (let i = 0; i < sortedKeys.length; i++) {
      const timeKey = sortedKeys[i];
      const data = combinedMap[timeKey];
      
      // Só incluir se temos dados de preço e sentimento
      if (data.prices.length > 0 && data.sentiments.length > 0) {
        const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
        const avgSentiment = data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length;
        
        // Calcular mudanças percentuais
        let priceChange = 0;
        let sentimentChange = 0;
        
        if (i > 0) {
          const prevKey = sortedKeys[i - 1];
          const prevData = combinedMap[prevKey];
          
          if (prevData.prices.length > 0 && prevData.sentiments.length > 0) {
            const prevPrice = prevData.prices.reduce((sum, p) => sum + p, 0) / prevData.prices.length;
            const prevSentiment = prevData.sentiments.reduce((sum, s) => sum + s, 0) / prevData.sentiments.length;
            
            priceChange = ((avgPrice - prevPrice) / prevPrice) * 100;
            sentimentChange = avgSentiment - prevSentiment;
          }
        }

        result.push({
          timestamp: parseInt(timeKey),
          price: avgPrice,
          sentiment: avgSentiment,
          priceChange,
          sentimentChange
        });
      }
    }

    return result;
  };

  const calculateCorrelation = (data: CorrelationData[]): number => {
    if (data.length < 2) return 0;

    const priceChanges = data.slice(1).map(d => d.priceChange);
    const sentimentChanges = data.slice(1).map(d => d.sentimentChange);

    if (priceChanges.length === 0) return 0;

    const n = priceChanges.length;
    const sumX = priceChanges.reduce((sum, x) => sum + x, 0);
    const sumY = sentimentChanges.reduce((sum, y) => sum + y, 0);
    const sumXY = priceChanges.reduce((sum, x, i) => sum + x * sentimentChanges[i], 0);
    const sumX2 = priceChanges.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = sentimentChanges.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const prepareChartData = () => {
    if (correlationData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = correlationData.map(item => {
      const date = new Date(item.timestamp);
      switch (timeRange) {
        case '1h':
        case '6h':
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        case '24h':
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        case '7d':
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        case '30d':
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        default:
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    });

    // Normalizar dados para visualização
    const prices = correlationData.map(d => d.price);
    const sentiments = correlationData.map(d => d.sentiment);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const normalizedPrices = prices.map(p => 
      priceRange > 0 ? ((p - minPrice) / priceRange) * 2 - 1 : 0
    );

    return {
      labels,
      datasets: [
        {
          label: 'Preço (Normalizado)',
          data: normalizedPrices,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Sentimento',
          data: sentiments,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y'
        }
      ]
    };
  };

  const getCorrelationText = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'Forte';
    if (abs >= 0.3) return 'Moderada';
    if (abs >= 0.1) return 'Fraca';
    return 'Muito Fraca';
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return correlation > 0 ? '#4caf50' : '#f44336';
    if (abs >= 0.3) return correlation > 0 ? '#8bc34a' : '#ff9800';
    return '#9e9e9e';
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Calculando correlação...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ height }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  const chartData = prepareChartData();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterTitle: function() {
            return `Correlação: ${correlationCoefficient.toFixed(3)} (${getCorrelationText(correlationCoefficient)})`;
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('Preço')) {
              const originalPrice = correlationData[context.dataIndex]?.price;
              return `${label}: ${value.toFixed(3)} (Original: $${originalPrice?.toFixed(2)})`;
            }
            return `${label}: ${value.toFixed(3)}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tempo'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Valores Normalizados'
        },
        min: -1,
        max: 1,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return value.toFixed(2);
          }
        }
      }
    }
  };

  if (chartData.labels.length === 0) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 1
        }}
      >
        <Typography color="text.secondary" gutterBottom>
          Dados insuficientes para calcular correlação
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Necessário dados de preço e sentimento para o período selecionado
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height }}>
      {/* Indicador de Correlação */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: getCorrelationColor(correlationCoefficient),
            fontWeight: 'bold'
          }}
        >
          Correlação: {correlationCoefficient.toFixed(3)} ({getCorrelationText(correlationCoefficient)})
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {correlationCoefficient > 0 ? 'Correlação Positiva' : 'Correlação Negativa'} - 
          {correlationData.length} pontos de dados
        </Typography>
      </Box>

      {/* Gráfico */}
      <Box sx={{ height: height - 80 }}>
        <Line data={chartData} options={options} />
      </Box>
    </Box>
  );
}; 