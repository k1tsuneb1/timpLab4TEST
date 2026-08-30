import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, MenuItem, Divider, List, ListItem, ListItemText, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';

export default function AdminPanel() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const [vulnName, setVulnName] = useState('');
  const [vulnRisk, setVulnRisk] = useState('');

  // Состояния для хранения списков
  const [users, setUsers] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);

  // Загружаем данные при открытии страницы
  useEffect(() => {
    fetchUsers();
    fetchVulnerabilities();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Ошибка загрузки пользователей");
    }
  };

  const fetchVulnerabilities = async () => {
    try {
      const res = await api.get('/vulnerabilities');
      setVulnerabilities(res.data);
    } catch (err) {
      console.error("Ошибка загрузки уязвимостей");
    }
  };

  // Обработчики СОЗДАНИЯ
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { username, password, role });
      toast.success('Пользователь успешно создан');
      setUsername(''); setPassword('');
      fetchUsers(); // Обновляем список
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка создания');
    }
  };

  const handleCreateVuln = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vulnerabilities', { name: vulnName, base_risk_score: parseInt(vulnRisk) });
      toast.success('Тип уязвимости добавлен');
      setVulnName(''); setVulnRisk('');
      fetchVulnerabilities(); // Обновляем список
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка добавления');
    }
  };

  // Обработчики УДАЛЕНИЯ
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Удалить сотрудника?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Сотрудник удален');
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleDeleteVuln = async (id) => {
    if (!window.confirm('Удалить тип уязвимости?')) return;
    try {
      await api.delete(`/vulnerabilities/${id}`);
      toast.success('Уязвимость удалена');
      setVulnerabilities(vulnerabilities.filter(v => v.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

return (
    <Stack spacing={4} sx={{ pb: 4 }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center">
        Панель администратора
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>
        
        {/* БЛОК ПОЛЬЗОВАТЕЛЕЙ */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h6" mb={2} color="primary.main">Добавить сотрудника</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TextField label="Логин" required value={username} onChange={e => setUsername(e.target.value)} size="small"/>
              <TextField label="Пароль" type="password" required value={password} onChange={e => setPassword(e.target.value)} size="small"/>
              <TextField select label="Роль" value={role} onChange={e => setRole(e.target.value)} size="small">
                <MenuItem value="user">Логист (user)</MenuItem>
                <MenuItem value="auditor">Аудитор (auditor)</MenuItem>
                <MenuItem value="admin">Админ (admin)</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" color="primary">Создать</Button>
            </form>
          </Paper>

          {/* Список пользователей */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список сотрудников</Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {users.map(u => (
                <ListItem key={u.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }}
                  secondaryAction={
                    <Button color="error" size="small" onClick={() => handleDeleteUser(u.id)} sx={{ minWidth: 0, p: '4px 8px' }}>✕</Button>
                  }
                >
                  <ListItemText primary={u.username} secondary={`Роль: ${u.role}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* БЛОК УЯЗВИМОСТЕЙ */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h6" mb={2} color="secondary.main">Справочник уязвимостей</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateVuln} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TextField label="Название" required value={vulnName} onChange={e => setVulnName(e.target.value)} size="small" />
              <TextField 
                label="Базовый риск (1-10)" type="number" 
                slotProps={{ htmlInput: { min: 1, max: 10 } }} 
                required value={vulnRisk} onChange={e => setVulnRisk(e.target.value)} size="small" 
              />
              <Button type="submit" variant="contained" color="secondary">Добавить уязвимость</Button>
            </form>
          </Paper>

          {/* Список уязвимостей */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список уязвимостей</Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {vulnerabilities.map(v => (
                <ListItem key={v.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }}
                  secondaryAction={
                    <Button color="error" size="small" onClick={() => handleDeleteVuln(v.id)} sx={{ minWidth: 0, p: '4px 8px' }}>✕</Button>
                  }
                >
                  <ListItemText primary={v.name} secondary={`Риск: ${v.base_risk_score}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

      </Box>
    </Stack>
  );
}