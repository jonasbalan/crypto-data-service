import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface WebSocketData {
  prices?: any;
  sentiment?: any;
  system?: any;
  notifications?: any[];
}

export const useWebSocket = (
  url: string = 'http://localhost:3000',
  options: UseWebSocketOptions = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<WebSocketData>({});
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, autoConnect]);

  const connect = () => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      socketRef.current = io(url, {
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error('Erro de conexão WebSocket:', err);
        setError(err.message);
        setIsConnected(false);
      });

      // Eventos de dados iniciais
      socket.on('prices:initial', (prices) => {
        setData(prev => ({ ...prev, prices }));
      });

      socket.on('sentiment:initial', (sentiment) => {
        setData(prev => ({ ...prev, sentiment }));
      });

      socket.on('system:initial', (system) => {
        setData(prev => ({ ...prev, system }));
      });

      // Eventos de atualizações
      socket.on('prices:update', (prices) => {
        setData(prev => ({ ...prev, prices }));
      });

      socket.on('sentiment:update', (sentiment) => {
        setData(prev => ({ ...prev, sentiment }));
      });

      socket.on('system:update', (system) => {
        setData(prev => ({ ...prev, system }));
      });

      // Notificações
      socket.on('notification', (notification) => {
        setData(prev => ({
          ...prev,
          notifications: [...(prev.notifications || []), notification]
        }));
      });

    } catch (err) {
      console.error('Erro ao conectar WebSocket:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const subscribe = (type: 'prices' | 'sentiment' | 'system', symbols?: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${type}`, symbols || []);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const clearNotifications = () => {
    setData(prev => ({ ...prev, notifications: [] }));
  };

  return {
    isConnected,
    data,
    error,
    connect,
    disconnect,
    subscribe,
    emit,
    clearNotifications
  };
}; 