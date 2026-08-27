import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig'; // Подключаем наш настроенный Axios

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // Отправляем логин и пароль на C++ бэкенд
      const response = await api.post('/auth/login', {
        username: username,
        password: password
      });

      // Если всё ок, сервер вернет JSON с токеном. Сохраняем его.
      const token = response.data.token;
      localStorage.setItem('token', token);
      
      toast.success('Успешный вход!');
      
      // Перенаправляем на дашборд
      window.location.href = '/dashboard';

    } catch (error) {
      console.error(error);
      // Показываем ошибку (например, "Неверный логин или пароль", которую возвращает C++)
      toast.error(
        error.response?.data?.error || 'Ошибка при подключении к серверу'
      );
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f0f2f5' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2, width: '320px' }}>
        <Typography variant="h5" textAlign="center" fontWeight="bold">
          Вход в систему
        </Typography>
        <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mb: 1 }}>
          Безопасность цепей поставок
        </Typography>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TextField 
            label="Логин" 
            variant="outlined" 
            size="small"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField 
            label="Пароль" 
            type="password" 
            variant="outlined" 
            size="small"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 1 }}>
            Войти
          </Button>
        </form>
      </Paper>
    </Box>
  );
}