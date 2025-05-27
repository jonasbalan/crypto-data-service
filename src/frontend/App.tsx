import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { ptBR } from 'date-fns/locale';

// Componentes de Layout
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Páginas
import Dashboard from './pages/Dashboard';
import MetricsDashboard from './pages/MetricsDashboard';
import SentimentDashboard from './pages/SentimentDashboard';
import NewsAnalysis from './pages/NewsAnalysis';
import PriceAnalysis from './pages/PriceAnalysis';
import TechnicalIndicatorsDashboard from './pages/TechnicalIndicatorsDashboard';
import Settings from './pages/Settings';

// Tema personalizado
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Navbar */}
        <Navbar onMenuClick={handleSidebarToggle} />
        
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Conteúdo Principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: 8, // Espaço para a navbar
            pl: { sm: sidebarOpen ? 30 : 0 }, // Espaço para a sidebar
            transition: 'padding-left 0.3s ease',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Routes>
            {/* Rota padrão */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard Principal */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Dashboard de Métricas */}
            <Route path="/metrics" element={<MetricsDashboard />} />
            
            {/* Dashboard de Sentimento */}
            <Route path="/sentiment" element={<SentimentDashboard />} />
            
            {/* Análise de Notícias */}
            <Route path="/news" element={<NewsAnalysis />} />
            
            {/* Análise de Preços */}
            <Route path="/prices" element={<PriceAnalysis />} />
            
            {/* Indicadores Técnicos Avançados */}
            <Route path="/technical-indicators" element={<TechnicalIndicatorsDashboard />} />
            
            {/* Configurações */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Rota 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App; 