import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tab,
  Tabs,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Fade,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  SmartToy as SmartToyIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import { SystemMetrics } from '../../services/metricsService';
import MetricsChart from '../components/charts/MetricsChart';
import MetricCard from '../components/MetricCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`metrics-tabpanel-${index}`}
      aria-labelledby={`metrics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MetricsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Histórico de métricas para gráficos
  const [metricsHistory, setMetricsHistory] = useState<{
    cpu: { timestamp: number; value: number }[];
    memory: { timestamp: number; value: number }[];
    api: { timestamp: number; value: number }[];
  }>({
    cpu: [],
    memory: [],
    api: []
  });

  const loadMetrics = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setRefreshing(true);
      
      console.log('📊 Carregando métricas do sistema...');
      const response = await fetch('/api/metrics/system');
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const newMetrics = result.data;
        setMetrics(newMetrics);
        setLastUpdate(new Date());
        setError(null);
        
        // Atualizar histórico
        const timestamp = Date.now();
        setMetricsHistory(prev => ({
          cpu: [...prev.cpu.slice(-19), { timestamp, value: newMetrics.system.cpu }],
          memory: [...prev.memory.slice(-19), { timestamp, value: newMetrics.system.memory.percentage }],
          api: [...prev.api.slice(-19), { timestamp, value: newMetrics.api.averageResponseTime }]
        }));
        
        console.log('✅ Métricas carregadas com sucesso');
      } else {
        throw new Error(result.error || 'Erro ao carregar métricas');
      }
    } catch (err: any) {
      console.error('❌ Erro ao carregar métricas:', err);
      setError(`Erro ao carregar métricas: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carregar métricas iniciais
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    loadMetrics(true);
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !metrics) {
    return <LoadingSpinner message="Carregando métricas do sistema..." fullHeight />;
  }

  if (error && !metrics) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Métricas
        </Typography>
        <ErrorDisplay 
          error={error} 
          onRetry={() => loadMetrics(true)}
          title="Erro ao carregar métricas"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Métricas
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-refresh"
          />
          
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Atualizar
          </Button>
          
          <Chip
            icon={<AutorenewIcon />}
            label={`Última atualização: ${lastUpdate.toLocaleTimeString('pt-BR')}`}
            variant="outlined"
            size="small"
          />
        </Box>
      </Box>

      {/* Status Alert */}
      {metrics && (
        <Fade in>
          <Alert 
            severity={
              metrics.services.some(s => s.status === 'offline') ? 'error' :
              metrics.services.some(s => s.status === 'warning') ? 'warning' : 'success'
            }
            sx={{ mb: 3 }}
          >
            Sistema {
              metrics.services.some(s => s.status === 'offline') ? 'com falhas' :
              metrics.services.some(s => s.status === 'warning') ? 'com avisos' : 'operacional'
            } - Uptime: {formatUptime(metrics.system.uptime)}
          </Alert>
        </Fade>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Visão Geral" />
          <Tab label="Sistema" />
          <Tab label="API" />
          <Tab label="Machine Learning" />
          <Tab label="Banco de Dados" />
        </Tabs>
      </Paper>

      {metrics && (
        <>
          {/* Tab 0: Visão Geral */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Cards principais */}
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="CPU"
                  value={metrics.system.cpu.toFixed(1)}
                  unit="%"
                  status={metrics.system.cpu > 80 ? 'error' : metrics.system.cpu > 60 ? 'warning' : 'success'}
                  icon={<SpeedIcon />}
                  progress={metrics.system.cpu}
                  lastUpdate={lastUpdate}
                  description="Uso atual do CPU"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Memória"
                  value={metrics.system.memory.percentage.toFixed(1)}
                  unit="%"
                  status={metrics.system.memory.percentage > 85 ? 'error' : metrics.system.memory.percentage > 70 ? 'warning' : 'success'}
                  icon={<MemoryIcon />}
                  progress={metrics.system.memory.percentage}
                  subtitle={`${formatBytes(metrics.system.memory.used)} / ${formatBytes(metrics.system.memory.total)}`}
                  lastUpdate={lastUpdate}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Tempo de Resposta"
                  value={metrics.api.averageResponseTime}
                  unit="ms"
                  status={metrics.api.averageResponseTime > 1000 ? 'error' : metrics.api.averageResponseTime > 500 ? 'warning' : 'success'}
                  icon={<ApiIcon />}
                  trend={metrics.api.averageResponseTime < 200 ? 'up' : 'down'}
                  trendValue="API"
                  lastUpdate={lastUpdate}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Requisições/min"
                  value={metrics.api.requestsPerMinute}
                  icon={<TimelineIcon />}
                  trend="up"
                  trendValue="+12%"
                  lastUpdate={lastUpdate}
                />
              </Grid>

              {/* Gráficos de tendência */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <MetricsChart
                    title="CPU (%)"
                    type="line"
                    data={metricsHistory.cpu}
                    unit="%"
                    height={280}
                    color="#ff6b35"
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <MetricsChart
                    title="Memória (%)"
                    type="line"
                    data={metricsHistory.memory}
                    unit="%"
                    height={280}
                    color="#4ecdc4"
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <MetricsChart
                    title="Tempo de Resposta (ms)"
                    type="line"
                    data={metricsHistory.api}
                    unit="ms"
                    height={280}
                    color="#45b7d1"
                  />
                </Paper>
              </Grid>

              {/* Status dos serviços */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Status dos Serviços
                  </Typography>
                  <Grid container spacing={2}>
                    {metrics.services.map((service, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <MetricCard
                          title={service.name}
                          value={service.responseTime}
                          unit="ms"
                          status={
                            service.status === 'online' ? 'success' :
                            service.status === 'warning' ? 'warning' : 'error'
                          }
                          subtitle={`Uptime: ${service.uptime}`}
                          description={`Última verificação: ${new Date(service.lastCheck).toLocaleTimeString('pt-BR')}`}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Sistema */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Recursos do Sistema
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <MetricCard
                        title="CPU Usage"
                        value={metrics.system.cpu.toFixed(2)}
                        unit="%"
                        status={metrics.system.cpu > 80 ? 'error' : 'success'}
                        icon={<SpeedIcon />}
                        progress={metrics.system.cpu}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MetricCard
                        title="Memória Total"
                        value={formatBytes(metrics.system.memory.total)}
                        status="info"
                        icon={<MemoryIcon />}
                        subtitle={`Livre: ${formatBytes(metrics.system.memory.total - metrics.system.memory.used)}`}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Uptime
                  </Typography>
                  <MetricCard
                    title="Tempo Online"
                    value={formatUptime(metrics.system.uptime)}
                    status="success"
                    icon={<TimelineIcon />}
                    subtitle="Sistema estável"
                  />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: API */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Estatísticas da API
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <MetricCard
                        title="Total de Requests"
                        value={metrics.api.totalRequests}
                        icon={<ApiIcon />}
                        status="info"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <MetricCard
                        title="Requests/min"
                        value={metrics.api.requestsPerMinute}
                        icon={<TimelineIcon />}
                        status="success"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <MetricCard
                        title="Taxa de Erro"
                        value={metrics.api.errorRate.toFixed(2)}
                        unit="%"
                        status={metrics.api.errorRate > 5 ? 'error' : metrics.api.errorRate > 2 ? 'warning' : 'success'}
                        progress={metrics.api.errorRate}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <MetricCard
                        title="Conexões Ativas"
                        value={metrics.api.activeConnections}
                        icon={<StorageIcon />}
                        status="info"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: 280 }}>
                  <MetricsChart
                    title="Distribuição de Status"
                    type="doughnut"
                    data={[
                      { label: 'Sucesso', value: 95, color: '#4caf50' },
                      { label: 'Erro', value: 5, color: '#f44336' }
                    ]}
                    height={200}
                  />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 3: ML */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Modelos de Machine Learning
                  </Typography>
                  <Grid container spacing={2}>
                    {metrics.ml.models.map((model, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <MetricCard
                          title={model.name}
                          value={(model.accuracy * 100).toFixed(1)}
                          unit="%"
                          status={
                            model.status === 'active' ? 'success' :
                            model.status === 'error' ? 'error' : 'warning'
                          }
                          subtitle={`Tipo: ${model.type}`}
                          icon={<SmartToyIcon />}
                          progress={model.accuracy * 100}
                          description={`${model.predictions} predições realizadas`}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 4: Database */}
          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Conexões do Banco
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        title="Ativas"
                        value={metrics.database.connections.active}
                        status="success"
                        icon={<StorageIcon />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        title="Idle"
                        value={metrics.database.connections.idle}
                        status="info"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        title="Total"
                        value={metrics.database.connections.total}
                        status="info"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Cache Performance
                  </Typography>
                  <MetricCard
                    title="Hit Rate"
                    value={metrics.database.cache.hitRate.toFixed(1)}
                    unit="%"
                    status={metrics.database.cache.hitRate > 80 ? 'success' : 'warning'}
                    progress={metrics.database.cache.hitRate}
                    subtitle={`${metrics.database.cache.hits} hits, ${metrics.database.cache.misses} misses`}
                  />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default MetricsDashboard; 