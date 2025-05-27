import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Box, Typography, useTheme } from '@mui/material';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface MetricPoint {
  timestamp: number;
  value: number;
}

interface MetricsChartProps {
  title: string;
  type: 'line' | 'bar' | 'doughnut';
  data: MetricPoint[] | { label: string; value: number; color?: string }[];
  unit?: string;
  height?: number;
  color?: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  type,
  data,
  unit = '',
  height = 300,
  color
}) => {
  const theme = useTheme();
  const defaultColor = color || theme.palette.primary.main;

  // Configurações comuns
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          font: {
            family: theme.typography.fontFamily
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1
      }
    }
  };

  // Preparar dados para gráfico de linha/bar
  const prepareTimeSeriesData = () => {
    const timeSeriesData = data as MetricPoint[];
    if (!timeSeriesData.length) return null;

    const labels = timeSeriesData.map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    });

    const values = timeSeriesData.map(point => point.value);

    return {
      labels,
      datasets: [
        {
          label: `${title} ${unit}`,
          data: values,
          borderColor: defaultColor,
          backgroundColor: type === 'bar' 
            ? `${defaultColor}80` 
            : `${defaultColor}20`,
          borderWidth: 2,
          fill: type === 'line',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: defaultColor,
          pointBorderColor: theme.palette.background.paper,
          pointBorderWidth: 2
        }
      ]
    };
  };

  // Preparar dados para gráfico de rosca
  const prepareDoughnutData = () => {
    const doughnutData = data as { label: string; value: number; color?: string }[];
    if (!doughnutData.length) return null;

    const colors = doughnutData.map(item => 
      item.color || theme.palette.primary.main
    );

    return {
      labels: doughnutData.map(item => item.label),
      datasets: [
        {
          data: doughnutData.map(item => item.value),
          backgroundColor: colors,
          borderColor: theme.palette.background.paper,
          borderWidth: 2,
          hoverBorderWidth: 3
        }
      ]
    };
  };

  // Opções específicas para linha
  const lineOptions = {
    ...commonOptions,
    scales: {
      x: {
        ticks: {
          color: theme.palette.text.secondary
        },
        grid: {
          color: theme.palette.divider,
          display: false
        }
      },
      y: {
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value: any) {
            return `${value}${unit}`;
          }
        },
        grid: {
          color: theme.palette.divider,
          drawBorder: false
        }
      }
    }
  };

  // Opções específicas para barra
  const barOptions = {
    ...commonOptions,
    scales: {
      x: {
        ticks: {
          color: theme.palette.text.secondary
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value: any) {
            return `${value}${unit}`;
          }
        },
        grid: {
          color: theme.palette.divider,
          drawBorder: false
        }
      }
    }
  };

  // Opções específicas para rosca
  const doughnutOptions = {
    ...commonOptions,
    cutout: '60%',
    plugins: {
      ...commonOptions.plugins,
      legend: {
        ...commonOptions.plugins.legend,
        position: 'right' as const
      },
      tooltip: {
        ...commonOptions.plugins.tooltip,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${context.raw}${unit} (${percentage}%)`;
          }
        }
      }
    }
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        const lineData = prepareTimeSeriesData();
        return lineData ? (
          <Line data={lineData} options={lineOptions} />
        ) : null;

      case 'bar':
        const barData = prepareTimeSeriesData();
        return barData ? (
          <Bar data={barData} options={barOptions} />
        ) : null;

      case 'doughnut':
        const doughnutData = prepareDoughnutData();
        return doughnutData ? (
          <Doughnut data={doughnutData} options={doughnutOptions} />
        ) : null;

      default:
        return null;
    }
  };

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Sem dados disponíveis
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          color: 'text.primary',
          mb: 2
        }}
      >
        {title}
      </Typography>
      <Box sx={{ height }}>
        {renderChart()}
      </Box>
    </Box>
  );
};

export default MetricsChart; 