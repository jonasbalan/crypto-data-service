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
  RadialLinearScale,
  ArcElement
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { SentimentResult } from '../../api/sentimentApi';

// Registrar componentes do ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Props do componente
interface SentimentChartProps {
  data: SentimentResult | null;
  loading: boolean;
}

const SentimentChart: React.FC<SentimentChartProps> = ({ data, loading }) => {
  if (loading) {
    return <Typography>Carregando dados...</Typography>;
  }

  if (!data) {
    return <Typography>Nenhum dado disponível</Typography>;
  }

  // Dados para o gráfico de barras de fontes
  const sourceChartData = {
    labels: ['Twitter', 'Reddit', 'Notícias'],
    datasets: [
      {
        label: 'Score de Sentimento por Fonte',
        data: [data.sources.twitter, data.sources.reddit, data.sources.news],
        backgroundColor: [
          'rgba(29, 161, 242, 0.7)', // Cor do Twitter
          'rgba(255, 69, 0, 0.7)',   // Cor do Reddit
          'rgba(0, 121, 107, 0.7)'   // Cor para Notícias
        ],
        borderColor: [
          'rgb(29, 161, 242)',
          'rgb(255, 69, 0)',
          'rgb(0, 121, 107)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Obter os 5 principais palavras-chave
  const topKeywords = data.keywords.slice(0, 5);

  // Dados para o gráfico de radar de palavras-chave
  const keywordChartData = {
    labels: topKeywords.map(k => k.word),
    datasets: [
      {
        label: 'Sentimento de Palavras-chave',
        data: topKeywords.map(k => k.sentiment),
        backgroundColor: 'rgba(63, 81, 181, 0.2)',
        borderColor: 'rgb(63, 81, 181)',
        pointBackgroundColor: 'rgb(63, 81, 181)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(63, 81, 181)',
      },
    ],
  };

  // Opções para os gráficos
  const sourceChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sentimento por Fonte',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        min: -1,
        max: 1,
      },
    },
  };

  const keywordChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Palavras-chave mais influentes',
      },
    },
    scales: {
      r: {
        min: -1,
        max: 1,
        ticks: {
          stepSize: 0.5,
        },
      },
    },
  };

  // Determinar a cor com base no sentimento
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'success.main';
    if (score < -0.3) return 'error.main';
    return 'warning.main';
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'Otimista';
      case 'bearish': return 'Pessimista';
      case 'neutral': return 'Neutro';
      default: return sentiment;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Sentimento Geral
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                color: getSentimentColor(data.sentimentScore),
                fontWeight: 'bold',
                mb: 1
              }}
            >
              {getSentimentText(data.overallSentiment)}
            </Typography>
            <Typography variant="body1">
              Score: {data.sentimentScore.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confiança: {data.confidence}%
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Bar data={sourceChartData} options={sourceChartOptions} />
          </Paper>
        </Grid>
        <Grid xs={12}>
          <Paper sx={{ p: 2 }}>
            <Radar data={keywordChartData} options={keywordChartOptions} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SentimentChart; 