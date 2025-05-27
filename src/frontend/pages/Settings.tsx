import React from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Switch, 
  FormControlLabel, 
  Divider,
  Alert
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Configurações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Personalize sua experiência no Crypto Data Service.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preferências Gerais
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            }
            label="Receber notificações"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Receba alertas sobre mudanças significativas no mercado
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Atualização automática"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Atualizar dados automaticamente a cada 30 segundos
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            }
            label="Modo escuro"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Alternar entre tema claro e escuro
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          Mais opções de configuração serão adicionadas em futuras atualizações.
        </Alert>
      </Paper>
    </Container>
  );
};

export default Settings; 