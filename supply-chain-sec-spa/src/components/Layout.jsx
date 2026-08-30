import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { useNavigate, Outlet } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token'); // Удаляем токен
    navigate('/login'); // Выкидываем на логин
  };

  // Если мы находимся на странице логина (нет токена), не рисуем верхнюю панель
  if (!token) {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. Верхняя навигационная панель (Header) */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: '#1e293b' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', letterSpacing: 1 }}>
            🛡️ SEC-LOGISTICS
          </Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            Дашборд
          </Button>
          <Button color="error" variant="outlined" onClick={handleLogout} sx={{ borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      {/* 2. Контейнер, который центрирует все страницы и дает им "воздух" (отступы) */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Outlet /> {/* Вот сюда React Router будет подставлять Дашборд, Админку и т.д. */}
      </Container>
      
    </Box>
  );
}