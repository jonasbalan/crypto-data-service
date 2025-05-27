import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Update as UpdateIcon
} from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: () => void;
  loading?: boolean;
  progress?: number; // 0-100
  subtitle?: string;
  lastUpdate?: Date;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  status = 'info',
  trend,
  trendValue,
  description,
  icon,
  action,
  loading = false,
  progress,
  subtitle,
  lastUpdate
}) => {
  const theme = useTheme();

  // Cores baseadas no status
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Ícone baseado no status
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />;
      case 'warning':
        return <WarningIcon color="warning" sx={{ fontSize: 16 }} />;
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  // Ícone de tendência
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" sx={{ fontSize: 16 }} />;
      case 'down':
        return <TrendingDownIcon color="error" sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  // Cor de tendência
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        },
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {loading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0,
            height: 2
          }} 
        />
      )}
      
      <CardContent sx={{ pb: 2 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon && (
              <Box sx={{ color: getStatusColor() }}>
                {icon}
              </Box>
            )}
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            {getStatusIcon()}
          </Box>
          
          {(description || action) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {description && (
                <Tooltip title={description} arrow>
                  <IconButton size="small">
                    <InfoIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {action && (
                <IconButton size="small" onClick={action}>
                  <UpdateIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          )}
        </Box>

        {/* Valor principal */}
        <Box sx={{ mb: 1 }}>
          <Typography 
            variant="h4" 
            component="div"
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2
            }}
          >
            {value}
            {unit && (
              <Typography 
                component="span" 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary',
                  ml: 0.5,
                  fontWeight: 400
                }}
              >
                {unit}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Subtitle */}
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Tendência */}
        {(trend || trendValue) && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            mb: 1
          }}>
            {getTrendIcon()}
            {trendValue && (
              <Typography 
                variant="body2"
                sx={{ 
                  color: getTrendColor(),
                  fontWeight: 500
                }}
              >
                {trendValue}
              </Typography>
            )}
          </Box>
        )}

        {/* Barra de progresso */}
        {typeof progress === 'number' && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mb: 0.5 
            }}>
              <Typography variant="body2" color="text.secondary">
                Progresso
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getStatusColor(),
                  borderRadius: 2
                }
              }}
            />
          </Box>
        )}

        {/* Última atualização */}
        {lastUpdate && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${theme.palette.divider}`
          }}>
            <UpdateIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography 
              variant="caption" 
              color="text.secondary"
            >
              {formatLastUpdate()}
            </Typography>
          </Box>
        )}

        {/* Status chip */}
        {status !== 'info' && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <Chip
              size="small"
              label={status}
              color={status as any}
              variant="outlined"
              sx={{ 
                fontSize: '0.75rem',
                height: 20,
                textTransform: 'capitalize'
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard; 