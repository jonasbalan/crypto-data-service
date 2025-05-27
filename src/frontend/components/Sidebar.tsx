import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Collapse,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
  Article as NewsIcon,
  TrendingUp as PricesIcon,
  Settings as SettingsIcon,
  BarChart as MetricsIcon,
  Notifications as AlertsIcon,
  Timeline as TechnicalIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: string | number;
  children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard Principal',
      icon: <DashboardIcon />,
      path: '/dashboard'
    },
    {
      text: 'Métricas do Sistema',
      icon: <MetricsIcon />,
      path: '/metrics',
      badge: 'Novo'
    },
    {
      text: 'Análise de Sentimento',
      icon: <PsychologyIcon />,
      path: '/sentiment',
      badge: 3 // Número de alertas
    },
    {
      text: 'Análise de Notícias',
      icon: <NewsIcon />,
      path: '/news'
    },
    {
      text: 'Análise de Preços',
      icon: <PricesIcon />,
      path: '/prices'
    },
    {
      text: 'Indicadores Técnicos',
      icon: <TechnicalIcon />,
      path: '/technical-indicators',
      badge: 'Novo'
    },
    {
      text: 'Configurações',
      icon: <SettingsIcon />,
      path: '/settings'
    }
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleExpandClick = (itemText: string) => {
    setExpandedItems(prev => 
      prev.includes(itemText) 
        ? prev.filter(item => item !== itemText)
        : [...prev, itemText]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.text);
    const active = isActive(item.path);

    return (
      <React.Fragment key={item.text}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.text);
              } else {
                handleItemClick(item.path);
              }
            }}
            selected={active}
            sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: active ? 'white' : 'text.secondary',
              }}
            >
              {item.icon}
            </ListItemIcon>
            
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
              }}
            />
            
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                color={typeof item.badge === 'number' ? 'error' : 'secondary'}
                sx={{ 
                  height: 20, 
                  fontSize: '0.75rem',
                  color: active ? 'primary.main' : undefined,
                  bgcolor: active ? 'white' : undefined,
                }}
              />
            )}
            
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header da Sidebar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          Crypto Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Dashboard de Análise
        </Typography>
      </Box>

      {/* Menu Principal */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 2 }}>
          {menuItems.map(item => renderMenuItem(item))}
        </List>
      </Box>

      {/* Footer da Sidebar */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Versão 1.0.0
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          © 2024 Crypto Data Service
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Melhor performance no mobile
      }}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 280,
          top: 64, // Altura da navbar
          height: 'calc(100% - 64px)',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar; 