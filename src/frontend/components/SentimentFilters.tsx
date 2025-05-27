import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

interface SentimentFilter {
  symbols?: string[];
  sources?: string[];
  sentiment?: ('positive' | 'negative' | 'neutral')[];
  dateRange?: {
    start: number;
    end: number;
  };
  minConfidence?: number;
  impact?: ('high' | 'medium' | 'low')[];
}

interface SentimentFiltersProps {
  filters: SentimentFilter;
  onFiltersChange: (filters: SentimentFilter) => void;
  availableSymbols: string[];
  availableSources: string[];
  onClear: () => void;
}

const SentimentFilters: React.FC<SentimentFiltersProps> = ({
  filters,
  onFiltersChange,
  availableSymbols,
  availableSources,
  onClear
}) => {
  const [startDate, setStartDate] = useState<Date | null>(
    filters.dateRange ? new Date(filters.dateRange.start) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    filters.dateRange ? new Date(filters.dateRange.end) : null
  );
  const [expanded, setExpanded] = useState(false);

  const handleSymbolsChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      symbols: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleSourcesChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      sources: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleSentimentChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      sentiment: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleImpactChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      impact: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleConfidenceChange = (event: Event, newValue: number | number[]) => {
    onFiltersChange({
      ...filters,
      minConfidence: newValue as number
    });
  };

  const handleDateRangeApply = () => {
    if (startDate && endDate) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: startDate.getTime(),
          end: endDate.getTime()
        }
      });
    } else {
      const { dateRange, ...rest } = filters;
      onFiltersChange(rest);
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onClear();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.symbols?.length) count++;
    if (filters.sources?.length) count++;
    if (filters.sentiment?.length) count++;
    if (filters.dateRange) count++;
    if (filters.minConfidence !== undefined) count++;
    if (filters.impact?.length) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Paper sx={{ mb: 3 }}>
      <Accordion expanded={expanded} onChange={(_, isExpanded) => setExpanded(isExpanded)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={2}>
            <FilterIcon />
            <Typography variant="h6">
              Filtros Avançados
            </Typography>
            {activeFiltersCount > 0 && (
              <Chip 
                label={`${activeFiltersCount} ativo${activeFiltersCount > 1 ? 's' : ''}`}
                size="small"
                color="primary"
              />
            )}
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Primeira linha - Filtros principais */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
              {/* Símbolos */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Símbolos</InputLabel>
                  <Select
                    multiple
                    value={filters.symbols || []}
                    onChange={handleSymbolsChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableSymbols.map((symbol) => (
                      <MenuItem key={symbol} value={symbol}>
                        {symbol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Fontes */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Fontes</InputLabel>
                  <Select
                    multiple
                    value={filters.sources || []}
                    onChange={handleSourcesChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableSources.map((source) => (
                      <MenuItem key={source} value={source}>
                        {source}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Tipo de Sentimento */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Sentimento</InputLabel>
                  <Select
                    multiple
                    value={filters.sentiment || []}
                    onChange={handleSentimentChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            color={
                              value === 'positive' ? 'success' :
                              value === 'negative' ? 'error' : 'default'
                            }
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="positive">Positivo</MenuItem>
                    <MenuItem value="negative">Negativo</MenuItem>
                    <MenuItem value="neutral">Neutro</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Impacto */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <FormControl fullWidth>
                  <InputLabel>Impacto</InputLabel>
                  <Select
                    multiple
                    value={filters.impact || []}
                    onChange={handleImpactChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            color={
                              value === 'high' ? 'error' :
                              value === 'medium' ? 'warning' : 'info'
                            }
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="high">Alto</MenuItem>
                    <MenuItem value="medium">Médio</MenuItem>
                    <MenuItem value="low">Baixo</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Segunda linha - Controles avançados */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              {/* Confiança Mínima */}
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>
                  Confiança Mínima: {filters.minConfidence ? `${(filters.minConfidence * 100).toFixed(0)}%` : 'Qualquer'}
                </Typography>
                <Slider
                  value={filters.minConfidence || 0}
                  onChange={handleConfidenceChange}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 0.5, label: '50%' },
                    { value: 1, label: '100%' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                />
              </Box>

              {/* Período */}
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>Período</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <DateTimePicker
                      label="Data Início"
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true,
                          size: 'small'
                        } 
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <DateTimePicker
                      label="Data Fim"
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true,
                          size: 'small'
                        } 
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Ações */}
            <Box>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  disabled={activeFiltersCount === 0}
                >
                  Limpar Filtros
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleDateRangeApply}
                  disabled={!startDate && !endDate && activeFiltersCount === 0}
                >
                  Aplicar Filtros
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Resumo dos Filtros Ativos */}
          {activeFiltersCount > 0 && (
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Filtros Ativos:
              </Typography>
              
              <Box display="flex" flexWrap="wrap" gap={1}>
                {filters.symbols?.map(symbol => (
                  <Chip 
                    key={`symbol-${symbol}`}
                    label={`Símbolo: ${symbol}`}
                    size="small"
                    onDelete={() => {
                      const newSymbols = filters.symbols?.filter(s => s !== symbol);
                      onFiltersChange({
                        ...filters,
                        symbols: newSymbols?.length ? newSymbols : undefined
                      });
                    }}
                  />
                ))}
                
                {filters.sources?.map(source => (
                  <Chip 
                    key={`source-${source}`}
                    label={`Fonte: ${source}`}
                    size="small"
                    onDelete={() => {
                      const newSources = filters.sources?.filter(s => s !== source);
                      onFiltersChange({
                        ...filters,
                        sources: newSources?.length ? newSources : undefined
                      });
                    }}
                  />
                ))}
                
                {filters.sentiment?.map(sentiment => (
                  <Chip 
                    key={`sentiment-${sentiment}`}
                    label={`Sentimento: ${sentiment}`}
                    size="small"
                    color={
                      sentiment === 'positive' ? 'success' :
                      sentiment === 'negative' ? 'error' : 'default'
                    }
                    onDelete={() => {
                      const newSentiment = filters.sentiment?.filter(s => s !== sentiment);
                      onFiltersChange({
                        ...filters,
                        sentiment: newSentiment?.length ? newSentiment : undefined
                      });
                    }}
                  />
                ))}
                
                {filters.impact?.map(impact => (
                  <Chip 
                    key={`impact-${impact}`}
                    label={`Impacto: ${impact}`}
                    size="small"
                    color={
                      impact === 'high' ? 'error' :
                      impact === 'medium' ? 'warning' : 'info'
                    }
                    onDelete={() => {
                      const newImpact = filters.impact?.filter(i => i !== impact);
                      onFiltersChange({
                        ...filters,
                        impact: newImpact?.length ? newImpact : undefined
                      });
                    }}
                  />
                ))}
                
                {filters.minConfidence !== undefined && (
                  <Chip 
                    label={`Confiança: ≥${(filters.minConfidence * 100).toFixed(0)}%`}
                    size="small"
                    onDelete={() => {
                      const { minConfidence, ...rest } = filters;
                      onFiltersChange(rest);
                    }}
                  />
                )}
                
                {filters.dateRange && (
                  <Chip 
                    label={`Período: ${new Date(filters.dateRange.start).toLocaleDateString()} - ${new Date(filters.dateRange.end).toLocaleDateString()}`}
                    size="small"
                    onDelete={() => {
                      const { dateRange, ...rest } = filters;
                      onFiltersChange(rest);
                      setStartDate(null);
                      setEndDate(null);
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default SentimentFilters; 