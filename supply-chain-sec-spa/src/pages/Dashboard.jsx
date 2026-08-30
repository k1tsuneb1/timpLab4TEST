import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Button, Typography, Paper, TableContainer, Table, TableHead, 
  TableBody, TableRow, TableCell, Tooltip, MenuItem, Select, 
  FormControl, InputLabel, TablePagination 
} from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import { jwtDecode } from "jwt-decode";

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState('Все');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  const token = localStorage.getItem('token');
  let userRole = '';
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userRole = decoded.role;
    } catch (e) {
      console.error("Ошибка чтения токена");
    }
  }

  useEffect(() => {
    api.get('/incidents')
      .then(response => setIncidents(response.data))
      .catch(error => {
        console.error('Ошибка загрузки данных:', error);
        toast.error('Не удалось загрузить инциденты');
      });
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/incidents/${id}`, { status: newStatus });
      toast.success(`Статус изменен на "${newStatus}"`);
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('Вы действительно хотите безвозвратно удалить этот инцидент?');
    if (!isConfirmed) return;
    try {
      await api.delete(`/incidents/${id}`);
      toast.success('Инцидент удален');
      setIncidents(prev => prev.filter(inc => inc.id !== id));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка при удалении инцидента');
    }
  };
  
  const filteredIncidents = incidents.filter(incident => 
    filterStatus === 'Все' ? true : incident.status === filterStatus
  );

  const paginatedIncidents = filteredIncidents.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );

  const handleFilterChange = (event) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Мониторинг инцидентов
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" onClick={() => navigate('/incidents/new')}>
            + Новый инцидент
          </Button>
          {userRole === 'admin' && (
            <Button variant="outlined" color="secondary" onClick={() => navigate('/admin')}>
              ⚙️ Админ-панель
            </Button>
          )}
        </Box>

        <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
          <InputLabel>Фильтр по статусу</InputLabel>
          <Select value={filterStatus} label="Фильтр по статусу" onChange={handleFilterChange}>
            <MenuItem value="Все">Все статусы</MenuItem>
            <MenuItem value="Зафиксирован">Зафиксирован</MenuItem>
            <MenuItem value="В обработке">В обработке</MenuItem>
            <MenuItem value="Решен">Решен</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Описание уязвимости</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '180px' }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Угроза</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Дата</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {paginatedIncidents.map((incident) => (
              <TableRow key={incident.id} hover>
                <TableCell sx={{ maxWidth: '250px' }}>
                  <Tooltip title={incident.description} arrow placement="top">
                    <Typography 
                      variant="body2" 
                      color="primary" 
                      sx={{ 
                        cursor: 'pointer', display: '-webkit-box', overflow: 'hidden',
                        WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      {incident.description}
                    </Typography>
                  </Tooltip>
                </TableCell>
                
                <TableCell>
                  {/* ЗАМЕНИЛИ ТЕКСТ НА ВЫПАДАЮЩИЙ СПИСОК */}
                  <FormControl size="small" fullWidth>
                    <Select
                      value={incident.status}
                      onChange={(e) => updateStatus(incident.id, e.target.value)}
                      disabled={userRole === 'user'} // Обычный логист не может менять статус
                      sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        bgcolor: incident.status === 'Решен' ? '#e8f5e9' : 
                                 incident.status === 'В обработке' ? '#fff3e0' : '#ffebee',
                        color: incident.status === 'Решен' ? 'success.main' : 
                               incident.status === 'В обработке' ? 'warning.main' : 'error.main'
                      }}
                    >
                      <MenuItem value="Зафиксирован">Зафиксирован</MenuItem>
                      <MenuItem value="В обработке">В обработке</MenuItem>
                      <MenuItem value="Решен">Решен</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {incident.severity_score || '0'}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  {new Date(incident.date).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                
                <TableCell align="center">
                  {/* УБРАЛИ СТАРЫЕ КНОПКИ СТАТУСА, ОСТАВИЛИ ТОЛЬКО УДАЛЕНИЕ */}
                  {userRole === 'admin' ? (
                    <Button variant="text" color="error" size="small" onClick={() => handleDelete(incident.id)} sx={{ minWidth: 'auto', p: '4px 8px' }}>✕</Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredIncidents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
        />
      </TableContainer>
    </Box>
  );
}