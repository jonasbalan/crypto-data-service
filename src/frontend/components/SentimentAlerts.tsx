import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Button,
  Alert,
  Collapse,
  Badge,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  VolumeUp as VolumeIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

interface SentimentAlert {
  id: string;
  type: 'sudden_change' | 'extreme_sentiment' | 'volume_spike';
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  symbol?: string;
  data: {
    previousScore?: number;
    currentScore?: number;
    change?: number;
    volume?: number;
    threshold?: number;
  };
  acknowledged?: boolean;
  dismissed?: boolean;
}

interface SentimentAlertsProps {
  alerts: SentimentAlert[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
}

const SentimentAlerts: React.FC<SentimentAlertsProps> = ({
  alerts,
  onAcknowledge,
  onDismiss,
  onRefresh,
  autoRefresh = true,
  onAutoRefreshChange
}) => {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string[]>(['high', 'medium', 'low']);
  const [filterType, setFilterType] = useState<string[]>(['sudden_change', 'extreme_sentiment', 'volume_spike']);
  const [showDismissed, setShowDismissed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    if (!filterSeverity.includes(alert.severity)) return false;
    if (!filterType.includes(alert.type)) return false;
    if (!showDismissed && alert.dismissed) return false;
    return true;
  });

  // Contar alertas por severidade
  const alertCounts = {
    high: filteredAlerts.filter(a => a.severity === 'high' && !a.dismissed).length,
    medium: filteredAlerts.filter(a => a.severity === 'medium' && !a.dismissed).length,
    low: filteredAlerts.filter(a => a.severity === 'low' && !a.dismissed).length,
    total: filteredAlerts.filter(a => !a.dismissed).length
  };

  const handleToggleExpand = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getAlertIcon = (alert: SentimentAlert) => {
    switch (alert.severity) {
      case 'high':
        return <ErrorIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'sudden_change':
        return <TrendingUpIcon />;
      case 'extreme_sentiment':
        return <TrendingDownIcon />;
      case 'volume_spike':
        return <VolumeIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'sudden_change':
        return 'Mudança Súbita';
      case 'extreme_sentiment':
        return 'Sentimento Extremo';
      case 'volume_spike':
        return 'Pico de Volume';
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const renderAlertDetails = (alert: SentimentAlert) => {
    const { data } = alert;
    
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Detalhes do Alerta
        </Typography>
        
        {data.previousScore !== undefined && data.currentScore !== undefined && (
          <Typography variant="body2">
            Score anterior: {(data.previousScore * 100).toFixed(1)}% → 
            Score atual: {(data.currentScore * 100).toFixed(1)}%
          </Typography>
        )}
        
        {data.change !== undefined && (
          <Typography variant="body2" color={data.change >= 0 ? 'success.main' : 'error.main'}>
            Mudança: {formatChange(data.change)}
          </Typography>
        )}
        
        {data.volume !== undefined && (
          <Typography variant="body2">
            Volume: {data.volume.toLocaleString()}
          </Typography>
        )}
        
        {data.threshold !== undefined && (
          <Typography variant="body2">
            Limite: {(data.threshold * 100).toFixed(1)}%
          </Typography>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {onAcknowledge && !alert.acknowledged && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAcknowledge(alert.id)}
            >
              Reconhecer
            </Button>
          )}
          
          {onDismiss && !alert.dismissed && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => onDismiss(alert.id)}
            >
              Dispensar
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Badge badgeContent={alertCounts.total} color="error">
            <NotificationsIcon />
          </Badge>
          <Typography variant="h6">
            Alertas de Sentimento
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {onAutoRefreshChange && (
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => onAutoRefreshChange(e.target.checked)}
                  size="small"
                />
              }
              label="Auto"
              sx={{ mr: 1 }}
            />
          )}
          
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          )}
          
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Resumo de Alertas */}
      <Box display="flex" gap={1} mb={2}>
        <Chip
          label={`${alertCounts.high} Críticos`}
          color="error"
          size="small"
          variant={alertCounts.high > 0 ? 'filled' : 'outlined'}
        />
        <Chip
          label={`${alertCounts.medium} Médios`}
          color="warning"
          size="small"
          variant={alertCounts.medium > 0 ? 'filled' : 'outlined'}
        />
        <Chip
          label={`${alertCounts.low} Baixos`}
          color="info"
          size="small"
          variant={alertCounts.low > 0 ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Lista de Alertas */}
      {filteredAlerts.length === 0 ? (
        <Alert severity="success">
          Nenhum alerta ativo no momento.
        </Alert>
      ) : (
        <List>
          {filteredAlerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              <ListItem
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: alert.dismissed ? 'grey.100' : 'background.paper',
                  opacity: alert.dismissed ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: 'grey.50'
                  }
                }}
                onClick={() => handleToggleExpand(alert.id)}
              >
                <ListItemIcon>
                  <Box position="relative">
                    {getAlertIcon(alert)}
                    <Box
                      position="absolute"
                      top={-4}
                      right={-4}
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getAlertTypeIcon(alert.type)}
                    </Box>
                  </Box>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {alert.message}
                      </Typography>
                      {alert.acknowledged && (
                        <Chip label="Reconhecido" size="small" color="success" />
                      )}
                      {alert.dismissed && (
                        <Chip label="Dispensado" size="small" color="default" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Chip
                        label={getAlertTypeLabel(alert.type)}
                        size="small"
                        variant="outlined"
                      />
                      {alert.symbol && (
                        <Chip
                          label={alert.symbol}
                          size="small"
                          color="primary"
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(alert.timestamp)}
                      </Typography>
                    </Box>
                  }
                />
                
                <Chip
                  label={alert.severity}
                  size="small"
                  color={getAlertColor(alert.severity) as any}
                />
              </ListItem>
              
              <Collapse in={expandedAlerts.has(alert.id)}>
                {renderAlertDetails(alert)}
              </Collapse>
              
              {index < filteredAlerts.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Menu de Opções */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setShowDismissed(!showDismissed);
          handleMenuClose();
        }}>
          {showDismissed ? 'Ocultar Dispensados' : 'Mostrar Dispensados'}
        </MenuItem>
        
        <MenuItem onClick={() => {
          setFilterSeverity(['high']);
          handleMenuClose();
        }}>
          Apenas Críticos
        </MenuItem>
        
        <MenuItem onClick={() => {
          setFilterSeverity(['high', 'medium', 'low']);
          handleMenuClose();
        }}>
          Todos os Níveis
        </MenuItem>
        
        <MenuItem onClick={() => {
          setExpandedAlerts(new Set(filteredAlerts.map(a => a.id)));
          handleMenuClose();
        }}>
          Expandir Todos
        </MenuItem>
        
        <MenuItem onClick={() => {
          setExpandedAlerts(new Set());
          handleMenuClose();
        }}>
          Recolher Todos
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default SentimentAlerts; 