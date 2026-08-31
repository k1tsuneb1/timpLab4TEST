import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, MenuItem, Divider, List, ListItem, ListItemText, Stack, Tabs, Tab } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPanel() {
  const [tabValue, setTabValue] = useState(0);

  // Состояния форм
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [vulnName, setVulnName] = useState('');
  const [vulnRisk, setVulnRisk] = useState('');
  
  const [sourceName, setSourceName] = useState('');
  const [measureName, setMeasureName] = useState('');

  // Состояния списков
  const [users, setUsers] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [sources, setSources] = useState([]);
  const [measures, setMeasures] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, vRes, sRes, mRes] = await Promise.all([
        api.get('/users'), api.get('/vulnerabilities'), api.get('/sources'), api.get('/measures')
      ]);
      setUsers(uRes.data); setVulnerabilities(vRes.data); setSources(sRes.data); setMeasures(mRes.data);
    } catch (err) {
      toast.error("Ошибка загрузки данных");
    }
  };

  // Обработчики создания
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { username, password, role, firstname, lastname, job_title: jobTitle, contact_email: contactEmail });
      toast.success('Пользователь создан');
      setUsername(''); setPassword(''); setFirstname(''); setLastname(''); setJobTitle(''); setContactEmail('');
      const res = await api.get('/users'); setUsers(res.data);
    } catch (error) { toast.error(error.response?.data?.error || 'Ошибка'); }
  };

  const handleCreateVuln = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vulnerabilities', { name: vulnName, base_risk_score: parseInt(vulnRisk) });
      toast.success('Уязвимость добавлена'); setVulnName(''); setVulnRisk('');
      const res = await api.get('/vulnerabilities'); setVulnerabilities(res.data);
    } catch (error) { toast.error(error.response?.data?.error || 'Ошибка'); }
  };

  const handleCreateSource = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sources', { name: sourceName });
      toast.success('Источник добавлен'); setSourceName('');
      const res = await api.get('/sources'); setSources(res.data);
    } catch (error) { toast.error(error.response?.data?.error || 'Ошибка'); }
  };

  const handleCreateMeasure = async (e) => {
    e.preventDefault();
    try {
      await api.post('/measures', { name: measureName });
      toast.success('Мера добавлена'); setMeasureName('');
      const res = await api.get('/measures'); setMeasures(res.data);
    } catch (error) { toast.error(error.response?.data?.error || 'Ошибка'); }
  };

  // Обработчики удаления
  const handleDelete = async (endpoint, id, setState, state) => {
    if (!window.confirm('Точно удалить?')) return;
    try {
      await api.delete(`/${endpoint}/${id}`);
      toast.success('Успешно удалено');
      setState(state.filter(item => item.id !== id));
    } catch (error) { toast.error(error.response?.data?.error || 'Ошибка удаления'); }
  };

  return (
    <Stack spacing={2} sx={{ pb: 4, maxWidth: '1000px', margin: '0 auto' }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center" mb={2}>Панель администратора</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)} centered>
          <Tab label="Сотрудники" />
          <Tab label="Уязвимости" />
          <Tab label="Источники" />
          <Tab label="Меры" />
        </Tabs>
      </Box>

      {/* ВКЛАДКА 0: СОТРУДНИКИ */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Paper elevation={2} sx={{ p: 4, flex: 1 }}>
            <Typography variant="h6" mb={2} color="primary.main">Добавить сотрудника</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <TextField label="Логин" required value={username} onChange={e => setUsername(e.target.value)} size="small"/>
              <TextField label="Пароль" type="password" required value={password} onChange={e => setPassword(e.target.value)} size="small"/>
              <TextField label="Имя" value={firstname} onChange={e => setFirstname(e.target.value)} size="small"/>
              <TextField label="Фамилия" value={lastname} onChange={e => setLastname(e.target.value)} size="small"/>
              <TextField label="Должность" value={jobTitle} onChange={e => setJobTitle(e.target.value)} size="small"/>
              <TextField label="Email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} size="small"/>
              <TextField select label="Роль" value={role} onChange={e => setRole(e.target.value)} size="small">
                <MenuItem value="user">Логист (user)</MenuItem>
                <MenuItem value="auditor">Аудитор (auditor)</MenuItem>
                <MenuItem value="admin">Админ (admin)</MenuItem>
              </TextField>
              <Button type="submit" variant="contained">Создать</Button>
            </form>
          </Paper>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список сотрудников</Typography>
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {users.map(u => (
                <ListItem key={u.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }} secondaryAction={
                  <Button color="error" size="small" onClick={() => handleDelete('users', u.id, setUsers, users)}>✕</Button>
                }>
                  <ListItemText primary={u.firstname || u.lastname ? `${u.firstname} ${u.lastname} (${u.username})` : u.username} secondary={`Роль: ${u.role}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </TabPanel>

      {/* ВКЛАДКА 1: УЯЗВИМОСТИ */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Paper elevation={2} sx={{ p: 4, flex: 1 }}>
            <Typography variant="h6" mb={2} color="secondary.main">Справочник уязвимостей</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateVuln} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <TextField label="Название" required value={vulnName} onChange={e => setVulnName(e.target.value)} size="small" />
              <TextField label="Базовый риск (1-10)" type="number" slotProps={{ htmlInput: { min: 1, max: 10 } }} required value={vulnRisk} onChange={e => setVulnRisk(e.target.value)} size="small" />
              <Button type="submit" variant="contained" color="secondary">Добавить</Button>
            </form>
          </Paper>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список уязвимостей</Typography>
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {vulnerabilities.map(v => (
                <ListItem key={v.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }} secondaryAction={
                  <Button color="error" size="small" onClick={() => handleDelete('vulnerabilities', v.id, setVulnerabilities, vulnerabilities)}>✕</Button>
                }>
                  <ListItemText primary={v.name} secondary={`Риск: ${v.base_risk_score}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </TabPanel>

      {/* ВКЛАДКА 2: ИСТОЧНИКИ */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Paper elevation={2} sx={{ p: 4, flex: 1 }}>
            <Typography variant="h6" mb={2} color="success.main">Справочник источников</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateSource} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <TextField label="Название источника" required value={sourceName} onChange={e => setSourceName(e.target.value)} size="small" />
              <Button type="submit" variant="contained" color="success">Добавить</Button>
            </form>
          </Paper>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список источников</Typography>
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {sources.map(s => (
                <ListItem key={s.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }} secondaryAction={
                  <Button color="error" size="small" onClick={() => handleDelete('sources', s.id, setSources, sources)}>✕</Button>
                }>
                  <ListItemText primary={s.name} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </TabPanel>

      {/* ВКЛАДКА 3: МЕРЫ */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Paper elevation={2} sx={{ p: 4, flex: 1 }}>
            <Typography variant="h6" mb={2} color="info.main">Справочник мер</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handleCreateMeasure} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <TextField label="Описание меры" required value={measureName} onChange={e => setMeasureName(e.target.value)} size="small" />
              <Button type="submit" variant="contained" color="info">Добавить</Button>
            </form>
          </Paper>
          <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Список мер</Typography>
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {measures.map(m => (
                <ListItem key={m.id} sx={{ bgcolor: '#f8fafc', mb: 1, borderRadius: 1 }} secondaryAction={
                  <Button color="error" size="small" onClick={() => handleDelete('measures', m.id, setMeasures, measures)}>✕</Button>
                }>
                  <ListItemText primary={m.name} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </TabPanel>

    </Stack>
  );
}
