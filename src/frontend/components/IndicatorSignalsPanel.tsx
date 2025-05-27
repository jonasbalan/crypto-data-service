import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import { ExpandMore, TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface Signal {
  timestamp: number;
  type: 'buy' | 'sell' | 'neutral';
  strength: number;
  description: string;
  confidence: number;
}

interface IndicatorSignalsPanelProps {
  bollingerSignals: Signal[];
  macdSignals: Signal[];
  structureSignals: Signal[];
  symbol: string;
}

const IndicatorSignalsPanel: React.FC<IndicatorSignalsPanelProps> = ({
  bollingerSignals,
  macdSignals,
  structureSignals,
  symbol
}) => {
  // Consolidar todos os sinais
  const allSignals = [
    ...bollingerSignals.map(s => ({ ...s, indicator: 'Bollinger Bands' })),
    ...macdSignals.map(s => ({ ...s, indicator: 'MACD' })),
    ...structureSignals.map(s => ({ ...s, indicator: 'Market Structure' }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Calcular sinal consolidado
  const calculateOverallSignal = () => {
    if (allSignals.length === 0) {
      return { type: 'neutral', strength: 0, confidence: 0 };
    }

    // Pegar apenas os sinais mais recentes (últimas 24h)
    const recentSignals = allSignals.filter(signal => 
      Date.now() - signal.timestamp < 24 * 60 * 60 * 1000
    );

    if (recentSignals.length === 0) {
      return { type: 'neutral', strength: 0, confidence: 0 };
    }

    // Calcular pesos por indicador
    const weights = {
      'Bollinger Bands': 0.3,
      'MACD': 0.4,
      'Market Structure': 0.3
    };

    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;

    recentSignals.forEach(signal => {
      const weight = weights[signal.indicator as keyof typeof weights] || 0.2;
      const signalStrength = signal.strength * signal.confidence;

      if (signal.type === 'buy') {
        buyScore += signalStrength * weight;
      } else if (signal.type === 'sell') {
        sellScore += signalStrength * weight;
      }

      totalWeight += weight;
      totalConfidence += signal.confidence * weight;
    });

    const avgConfidence = totalConfidence / totalWeight;
    const netScore = buyScore - sellScore;
    const strength = Math.abs(netScore) / totalWeight;

    let type: 'buy' | 'sell' | 'neutral';
    if (netScore > 0.1) {
      type = 'buy';
    } else if (netScore < -0.1) {
      type = 'sell';
    } else {
      type = 'neutral';
    }

    return {
      type,
      strength: Math.min(strength, 1),
      confidence: Math.min(avgConfidence, 1)
    };
  };

  const overallSignal = calculateOverallSignal();

  // Agrupar sinais por indicador
  const signalsByIndicator = {
    'Bollinger Bands': bollingerSignals,
    'MACD': macdSignals,
    'Market Structure': structureSignals
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp />;
      case 'sell': return <TrendingDown />;
      default: return <TrendingFlat />;
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'buy': return 'success';
      case 'sell': return 'error';
      default: return 'default';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.7) return 'success';
    if (strength >= 0.4) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* Sinal Consolidado */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ color: 'white', textAlign: 'center' }}>
            🎯 Sinal Consolidado - {symbol}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mb: 2 }}>
            <Chip
              icon={getSignalIcon(overallSignal.type)}
              label={overallSignal.type.toUpperCase()}
              color={getSignalColor(overallSignal.type) as any}
              variant="filled"
              sx={{ fontSize: '1.2rem', padding: '8px 16px' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {(overallSignal.strength * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Força do Sinal
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={overallSignal.strength * 100}
                color={getStrengthColor(overallSignal.strength)}
                sx={{ mt: 1, width: 100 }}
              />
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {(overallSignal.confidence * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Confiança
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={overallSignal.confidence * 100}
                color="info"
                sx={{ mt: 1, width: 100 }}
              />
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {allSignals.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Sinais Totais
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Resumo por Indicador */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Resumo por Indicador
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(signalsByIndicator).map(([indicator, signals]) => {
              const recentSignal = signals[0];
              const signalCount = signals.length;
              
              return (
                <Card key={indicator} variant="outlined" sx={{ minWidth: 200 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {indicator}
                    </Typography>
                    
                    {recentSignal ? (
                      <>
                        <Chip
                          label={recentSignal.type.toUpperCase()}
                          color={getSignalColor(recentSignal.type) as any}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Força: {(recentSignal.strength * 100).toFixed(0)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Confiança: {(recentSignal.confidence * 100).toFixed(0)}%
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum sinal
                      </Typography>
                    )}
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {signalCount} sinais
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Sinais Detalhados */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Histórico de Sinais
          </Typography>
          
          {allSignals.length === 0 ? (
            <Alert severity="info">
              Nenhum sinal disponível para este símbolo.
            </Alert>
          ) : (
            Object.entries(signalsByIndicator).map(([indicator, signals]) => (
              <Accordion key={indicator} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle1">
                      {indicator}
                    </Typography>
                    <Chip 
                      label={`${signals.length} sinais`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  {signals.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum sinal disponível
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {signals.slice(0, 5).map((signal, index) => (
                        <Card key={index} variant="outlined">
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Chip
                                icon={getSignalIcon(signal.type)}
                                label={signal.type.toUpperCase()}
                                color={getSignalColor(signal.type) as any}
                                size="small"
                              />
                              <Typography variant="body2" color="text.secondary">
                                {new Date(signal.timestamp).toLocaleString('pt-BR')}
                              </Typography>
                            </Box>
                            
                            <Typography variant="body2" gutterBottom>
                              {signal.description}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Força: {(signal.strength * 100).toFixed(0)}%
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={signal.strength * 100}
                                  color={getStrengthColor(signal.strength)}
                                />
                              </Box>
                              
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Confiança: {(signal.confidence * 100).toFixed(0)}%
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={signal.confidence * 100}
                                  color="info"
                                />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {signals.length > 5 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                          ... e mais {signals.length - 5} sinais
                        </Typography>
                      )}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default IndicatorSignalsPanel; 