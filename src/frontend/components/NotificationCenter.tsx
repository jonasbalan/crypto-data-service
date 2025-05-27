import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  Button
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  TrendingUp,
  TrendingDown,
  Warning,
  Info,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'price' | 'sentiment';
  title: string;
  message: string;
  timestamp: number;
  data?: any;
  read?: boolean;
}

const NotificationCenter: React.FC = () => {
  const { data, isConnected } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [currentSnackbar, setCurrentSnackbar] = useState<Notification | null>(null);

  // Processar notificações do WebSocket
  useEffect(() => {
    if (data.notifications && data.notifications.length > 0) {
      const newNotifications = data.notifications.map((notif: any) => ({
        id: `${notif.timestamp}-${Math.random()}`,
        type: notif.type || 'info',
        title: notif.title || 'Notificação',
        message: notif.message,
        timestamp: notif.timestamp,
        data: notif.data,
        read: false
      }));

      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50)); // Manter apenas 50 notificações

      // Mostrar snackbar para a notificação mais recente
      if (newNotifications.length > 0) {
        setCurrentSnackbar(newNotifications[0]);
        setSnackbarOpen(true);
      }
    }
  }, [data.notifications]);

  // Gerar notificações baseadas em mudanças de preço
  useEffect(() => {
    if (data.prices) {
      Object.entries(data.prices).forEach(([symbol, priceData]: [string, any]) => {
        if (Math.abs(priceData.change) > 5) { // Mudança > 5%
          const notification: Notification = {
            id: `price-${symbol}-${Date.now()}`,
            type: priceData.change > 0 ? 'success' : 'warning',
            title: `Alerta de Preço - ${symbol}`,
            message: `${symbol} ${priceData.change > 0 ? 'subiu' : 'caiu'} ${Math.abs(priceData.change).toFixed(2)}%`,
            timestamp: Date.now(),
            data: priceData,
            read: false
          };

          setNotifications(prev => [notification, ...prev].slice(0, 50));
        }
      });
    }
  }, [data.prices]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'price':
        return <TrendingUp color="primary" />;
      case 'sentiment':
        return <TrendingDown color="secondary" />;
      default:
        return <Info color="info" />;
    }
  };

  const getAlertSeverity = (type: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const open = Boolean(anchorEl);

  return (
    <>
      {/* Ícone de Notificações */}
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
        {isConnected && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'success.main'
            }}
          />
        )}
      </IconButton>

      {/* Popover com Lista de Notificações */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Notificações
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Box>
              {unreadCount > 0 && (
                <Button size="small" onClick={markAllAsRead} sx={{ mr: 1 }}>
                  Marcar todas
                </Button>
              )}
              <Button size="small" onClick={clearAll} color="error">
                Limpar
              </Button>
            </Box>
          </Box>

          {notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhuma notificação
            </Typography>
          ) : (
            <List sx={{ maxHeight: 350, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <ListItemIcon>
                    {getIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      {/* Snackbar para Notificações Instantâneas */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={currentSnackbar ? getAlertSeverity(currentSnackbar.type) : 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          <Typography variant="subtitle2">{currentSnackbar?.title || ''}</Typography>
          <Typography variant="body2">{currentSnackbar?.message || ''}</Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationCenter; 