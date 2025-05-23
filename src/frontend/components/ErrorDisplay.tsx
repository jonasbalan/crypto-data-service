import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  title?: string;
  severity?: 'error' | 'warning' | 'info';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  title = 'Erro',
  severity = 'error' 
}) => {
  return (
    <Box sx={{ my: 2 }}>
      <Alert severity={severity}>
        <AlertTitle>{title}</AlertTitle>
        {error}
        {onRetry && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Tentar Novamente
            </Button>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

export default ErrorDisplay; 