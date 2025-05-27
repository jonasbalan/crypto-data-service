import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Psychology,
  Speed,
  Analytics
} from '@mui/icons-material';
import MetricCard from './MetricCard';

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

interface SentimentMetricsProps {
  data: SentimentData[];
  symbol: string;
  timeRange: string;
}

export const SentimentMetrics: React.FC<SentimentMetricsProps> = ({
  data,
  symbol,
  timeRange
}) => {
  // Calcular métricas
  const totalAnalyses = data.length;
  const positiveCount = data.filter(d => d.sentiment === 'positive').length;
  const negativeCount = data.filter(d => d.sentiment === 'negative').length;
  const neutralCount = data.filter(d => d.sentiment === 'neutral').length;

  const positivePercentage = totalAnalyses > 0 ? (positiveCount / totalAnalyses) * 100 : 0;
  const negativePercentage = totalAnalyses > 0 ? (negativeCount / totalAnalyses) * 100 : 0;
  const neutralPercentage = totalAnalyses > 0 ? (neutralCount / totalAnalyses) * 100 : 0;

  const averageScore = totalAnalyses > 0 
    ? data.reduce((sum, d) => sum + d.score, 0) / totalAnalyses 
    : 0;

  const averageConfidence = totalAnalyses > 0 
    ? data.reduce((sum, d) => sum + d.confidence, 0) / totalAnalyses 
    : 0;

  // Determinar sentimento geral
  const overallSentiment = positiveCount > negativeCount 
    ? (positiveCount > neutralCount ? 'positive' : 'neutral')
    : (negativeCount > neutralCount ? 'negative' : 'neutral');

  // Calcular tendência (comparar primeira e segunda metade dos dados)
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);

  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length 
    : 0;
  const secondHalfAvg = secondHalf.length > 0 
    ? secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length 
    : 0;

  const trend = secondHalfAvg > firstHalfAvg + 0.1 ? 'up' 
    : secondHalfAvg < firstHalfAvg - 0.1 ? 'down' 
    : 'stable';

  // Fontes de dados
  const sources = [...new Set(data.map(d => d.source))];
  const sourceDistribution = sources.map(source => ({
    source,
    count: data.filter(d => d.source === source).length,
    percentage: (data.filter(d => d.source === source).length / totalAnalyses) * 100
  }));

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp color="success" />;
      case 'negative': return <TrendingDown color="error" />;
      default: return <TrendingFlat color="info" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
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

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Métricas de Sentimento - {symbol} ({timeRange})
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Métricas Principais */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Sentimento Geral"
              value={overallSentiment.toUpperCase()}
              icon={getSentimentIcon(overallSentiment)}
              status={getSentimentColor(overallSentiment) === 'default' ? 'info' : getSentimentColor(overallSentiment) as 'success' | 'error'}
              trend={trend}
              subtitle={`Score: ${averageScore.toFixed(2)}`}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Total de Análises"
              value={totalAnalyses.toString()}
              icon={<Analytics />}
              status="info"
              subtitle={`Últimas ${timeRange}`}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Confiança Média"
              value={`${(averageConfidence * 100).toFixed(1)}%`}
              icon={<Psychology />}
              status="info"
              progress={averageConfidence * 100}
              subtitle="Precisão do modelo"
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <MetricCard
              title="Tendência"
              value={trend === 'up' ? 'ALTA' : trend === 'down' ? 'BAIXA' : 'ESTÁVEL'}
              icon={getTrendIcon(trend)}
              status={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'info'}
              subtitle="Evolução recente"
            />
          </Box>
        </Box>

        {/* Distribuição de Sentimentos e Fontes */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Distribuição de Sentimentos
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Positivo</Typography>
                  <Typography variant="body2">{positiveCount} ({positivePercentage.toFixed(1)}%)</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={positivePercentage} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Negativo</Typography>
                  <Typography variant="body2">{negativeCount} ({negativePercentage.toFixed(1)}%)</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={negativePercentage} 
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Neutro</Typography>
                  <Typography variant="body2">{neutralCount} ({neutralPercentage.toFixed(1)}%)</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={neutralPercentage} 
                  color="info"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`+${positiveCount}`} 
                  color="success" 
                  size="small" 
                  icon={<TrendingUp />}
                />
                <Chip 
                  label={`-${negativeCount}`} 
                  color="error" 
                  size="small" 
                  icon={<TrendingDown />}
                />
                <Chip 
                  label={`=${neutralCount}`} 
                  color="default" 
                  size="small" 
                  icon={<TrendingFlat />}
                />
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Fontes de Dados
              </Typography>
              
              {sourceDistribution.map((source, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {source.source}
                    </Typography>
                    <Typography variant="body2">
                      {source.count} ({source.percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={source.percentage} 
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}

              {sources.length === 0 && (
                <Typography color="text.secondary">
                  Nenhuma fonte de dados disponível
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {sources.map((source, index) => (
                  <Chip 
                    key={index}
                    label={source} 
                    size="small" 
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Estatísticas Avançadas */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estatísticas Avançadas
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {averageScore.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score Médio
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Escala: -1 a +1
                </Typography>
              </Box>

              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {(averageConfidence * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confiança Média
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Precisão do modelo
                </Typography>
              </Box>

              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {sources.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fontes Ativas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Diversificação
                </Typography>
              </Box>

              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {Math.max(positivePercentage, negativePercentage, neutralPercentage).toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sentimento Dominante
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maior categoria
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}; 