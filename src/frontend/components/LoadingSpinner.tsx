import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullHeight?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Carregando...', 
  size = 40,
  fullHeight = false 
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: fullHeight ? 8 : 4,
        height: fullHeight ? '50vh' : 'auto'
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner; 