import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Divider, Chip, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';

export default function IncidentDetails() {
  const { id } = useParams(); // Берем ID из URL
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем данные конкретного инцидента
    api.get(`/incidents/${id}`)
      .then(response => {
        setIncident(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        toast.error('Ошибка при загрузке данных инцидента');
        navigate('/dashboard'); // Если ошибка — кидаем обратно на дашборд
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4, maxWidth: '800px', margin: '0 auto' }}>
      <Button 
        variant="text" 
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 2 }}
      >
        ← Назад к списку
      </Button>

      <Paper elevation={3} sx={{ padding: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            Инцидент #{incident.id}
          </Typography>
          <Chip 
            label={incident.status} 
            color={incident.status === 'Решен' ? 'success' : incident.status === 'В обработке' ? 'warning' : 'error'} 
            variant="outlined"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            <strong>Тип уязвимости:</strong> {incident.vulnerability_name} (Базовый риск: {incident.base_risk_score})
          </Typography>
          
          <Typography variant="body1">
            <strong>Итоговая угроза (Severity):</strong> <span style={{ color: 'red', fontWeight: 'bold' }}>{incident.severity_score}</span>
          </Typography>

          <Typography variant="body1">
            <strong>Зафиксировал сотрудник:</strong> {incident.employee_username}
          </Typography>

          <Typography variant="body1">
            <strong>Дата фиксации:</strong> {new Date(incident.date).toLocaleString('ru-RU')}
          </Typography>

          <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Подробное описание:
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {incident.description}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}