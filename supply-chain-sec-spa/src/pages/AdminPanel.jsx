import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, MenuItem, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';

export default function AdminPanel() {
  const navigate = useNavigate();

  // Стейты для нового пользователя
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  // Стейты для новой уязвимости
  const [vulnId, setVulnId] = useState('');
  const [vulnName, setVulnName] = useState('');
  const [vulnRisk, setVulnRisk] = useState('');

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { 
        id: parseInt(userId), 
        username, 
        password, 
        role 
      });
      toast.success('Пользователь успешно создан');
      setUserId(''); setUsername(''); setPassword('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка создания пользователя');
    }
  };

  const handleCreateVuln = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vulnerabilities', { 
        id: parseInt(vulnId), 
        name: vulnName, 
        base_risk_score: parseInt(vulnRisk) 
      });
      toast.success('Тип уязвимости добавлен');
      setVulnId(''); setVulnName(''); setVulnRisk('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка добавления уязвимости');
    }
  };

  return (
    <Box sx={{ padding: 4, maxWidth: '900px', margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Панель администратора</Typography>
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>На Дашборд</Button>
      </Box>

      {/* Заменили проблемный Grid на надежный Flexbox */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        
        {/* Форма создания пользователя */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Добавить сотрудника</Typography>
            <Divider sx={{ mb: 2 }} />
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField label="ID (число)" type="number" required value={userId} onChange={e => setUserId(e.target.value)} size="small" />
              <TextField label="Логин" required value={username} onChange={e => setUsername(e.target.value)} size="small" />
              <TextField label="Пароль" type="password" required value={password} onChange={e => setPassword(e.target.value)} size="small" />
              <TextField select label="Роль" value={role} onChange={e => setRole(e.target.value)} size="small">
                <MenuItem value="user">Логист (user)</MenuItem>
                <MenuItem value="auditor">Аудитор (auditor)</MenuItem>
                <MenuItem value="admin">Админ (admin)</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" color="primary">Создать</Button>
            </form>
          </Paper>
        </Box>

        {/* Форма создания уязвимости */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Справочник уязвимостей</Typography>
            <Divider sx={{ mb: 2 }} />
            <form onSubmit={handleCreateVuln} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField label="ID уязвимости (число)" type="number" required value={vulnId} onChange={e => setVulnId(e.target.value)} size="small" />
              <TextField label="Название" required value={vulnName} onChange={e => setVulnName(e.target.value)} size="small" />
              
              {/* Исправлено inputProps на slotProps для новой версии MUI */}
              <TextField 
                label="Базовый риск (1-10)" 
                type="number" 
                slotProps={{ htmlInput: { min: 1, max: 10 } }} 
                required 
                value={vulnRisk} 
                onChange={e => setVulnRisk(e.target.value)} 
                size="small" 
              />
              
              <Button type="submit" variant="contained" color="secondary" sx={{ mt: 1 }}>Добавить уязвимость</Button>
            </form>
          </Paper>
        </Box>

      </Box>
    </Box>
  );
}