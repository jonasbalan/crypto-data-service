import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Collapse,
  Alert,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Schedule as ScheduleIcon,
  TrendingUp as BullishIcon,
  TrendingDown as BearishIcon,
  TrendingFlat as NeutralIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  keywords?: string[];
}

interface NewsResponse {
  success: boolean;
  data: NewsItem[];
  count: number;
  timestamp: string;
}

interface RealNewsDisplayProps {
  symbol?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // em segundos
  maxItems?: number;
}

const RealNewsDisplay: React.FC<RealNewsDisplayProps> = ({
  symbol,
  autoRefresh = true,
  refreshInterval = 300, // 5 minutos
  maxItems = 20
}) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [symbol, autoRefresh, refreshInterval]);

  const fetchNews = async () => {
    if (!loading && news.length > 0) {
      // Refresh silencioso se já temos dados
      try {
        const url = symbol 
          ? `/api/real/news/${symbol}?limit=${maxItems}`
          : `/api/real/news?limit=${maxItems}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data: NewsResponse = await response.json();
          setNews(data.data);
          setLastUpdate(new Date());
          setError(null);
        }
      } catch (err) {
        console.error('Erro no refresh silencioso:', err);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = symbol 
        ? `/api/real/news/${symbol}?limit=${maxItems}`
        : `/api/real/news?limit=${maxItems}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data: NewsResponse = await response.json();
      
      if (data.success) {
        setNews(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (err: any) {
      setError(`Erro ao carregar notícias: ${err.message}`);
      console.error('Erro ao buscar notícias:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <BullishIcon color="success" fontSize="small" />;
      case 'negative':
        return <BearishIcon color="error" fontSize="small" />;
      case 'neutral':
      default:
        return <NeutralIcon color="action" fontSize="small" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      case 'neutral':
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (loading && news.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {symbol ? `Notícias sobre ${symbol}` : 'Notícias do Mercado Cripto'}
        </Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Carregando notícias...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {symbol ? `Notícias sobre ${symbol}` : 'Notícias do Mercado Cripto'}
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={fetchNews}
          startIcon={<RefreshIcon />}
        >
          Tentar Novamente
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {symbol ? `Notícias sobre ${symbol}` : 'Notícias do Mercado Cripto'}
          <Badge badgeContent={news.length} color="primary" sx={{ ml: 2 }} />
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdate && (
            <Tooltip title={`Última atualização: ${lastUpdate.toLocaleTimeString()}`}>
              <Chip
                icon={<ScheduleIcon />}
                label={formatTimeAgo(lastUpdate.toISOString())}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
          
          <IconButton 
            onClick={fetchNews}
            disabled={loading}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {news.length === 0 ? (
        <Alert severity="info">
          Nenhuma notícia encontrada {symbol ? `para ${symbol}` : ''}.
        </Alert>
      ) : (
        <List sx={{ p: 0 }}>
          {news.map((item, index) => (
            <React.Fragment key={index}>
              <Card 
                sx={{ 
                  mb: 2, 
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" sx={{ flexGrow: 1, mr: 2 }}>
                      {item.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      {item.sentiment && (
                        <Tooltip title={`Sentimento: ${item.sentiment} (${(item.sentimentScore || 0).toFixed(2)})`}>
                          <Chip
                            icon={getSentimentIcon(item.sentiment)}
                            label={item.sentiment}
                            size="small"
                            color={getSentimentColor(item.sentiment) as any}
                          />
                        </Tooltip>
                      )}
                      
                      <Chip
                        label={item.source}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatTimeAgo(item.pubDate)}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {item.description.length > 150 && !expandedItems.has(index)
                      ? `${item.description.substring(0, 150)}...`
                      : item.description
                    }
                  </Typography>

                  {item.keywords && item.keywords.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Palavras-chave:
                      </Typography>
                      {item.keywords.slice(0, 5).map((keyword, kidx) => (
                        <Chip
                          key={kidx}
                          label={keyword}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Box>
                    {item.description.length > 150 && (
                      <Button
                        size="small"
                        onClick={() => toggleExpanded(index)}
                        endIcon={expandedItems.has(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      >
                        {expandedItems.has(index) ? 'Ver menos' : 'Ver mais'}
                      </Button>
                    )}
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ler completa
                  </Button>
                </CardActions>
              </Card>

              {index < news.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}

      {autoRefresh && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Atualização automática a cada {Math.floor(refreshInterval / 60)} minutos
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default RealNewsDisplay; 