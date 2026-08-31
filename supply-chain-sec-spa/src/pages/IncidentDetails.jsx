import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Button, Divider, Chip, CircularProgress, Stack, 
  TextField, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText 
} from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';

export default function IncidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [allMeasures, setAllMeasures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Состояния для режима редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editMeasureIds, setEditMeasureIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id, navigate]);

  const fetchData = async () => {
    try {
      const [incRes, measRes] = await Promise.all([
        api.get(`/incidents/${id}`),
        api.get('/measures')
      ]);
      setIncident(incRes.data);
      setAllMeasures(measRes.data);
      setLoading(false);
    } catch (error) {
      toast.error('Ошибка при загрузке данных инцидента');
      navigate('/dashboard');
    }
  };

  const handleEditClick = () => {
    setEditDescription(incident.description || '');
    setEditMeasureIds(incident.measures ? incident.measures.map(m => m.id) : []);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await api.put(`/incidents/${id}`, {
        description: editDescription,
        measureIds: editMeasureIds
      });
      toast.success('Инцидент успешно обновлен');
      setIsEditing(false);
      fetchData(); // Перезагружаем свежие данные
    } catch (error) {
      toast.error('Ошибка при сохранении изменений');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ padding: 4, maxWidth: '800px', margin: '0 auto' }}>
      <Button variant="text" onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>← Назад к списку</Button>

      <Paper elevation={3} sx={{ padding: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h4" fontWeight="bold">Инцидент #{incident.id}</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              label={incident.status} 
              color={incident.status === 'Закрыт' ? 'success' : incident.status === 'В работе' ? 'warning' : 'error'} 
              variant="outlined" sx={{ fontWeight: 'bold' }}
            />
            {!isEditing && <Button variant="outlined" size="small" onClick={handleEditClick}>Редактировать</Button>}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {incident.tracking_number && <Typography variant="body1"><strong>Трек-номер груза:</strong> {incident.tracking_number}</Typography>}
          <Typography variant="body1"><strong>Тип уязвимости:</strong> {incident.vulnerability || 'Не указано'}</Typography>
          <Typography variant="body1"><strong>Источник информации:</strong> {incident.source || 'Не указан'}</Typography>
          <Typography variant="body1"><strong>Итоговая угроза (Severity):</strong> <span style={{ color: 'red', fontWeight: 'bold' }}>{incident.severity_score}</span></Typography>
          <Typography variant="body1"><strong>Зафиксировал:</strong> {incident.reporter}</Typography>
          <Typography variant="body1"><strong>Дата фиксации:</strong> {new Date(incident.date).toLocaleString('ru-RU')}</Typography>

          <Divider sx={{ my: 1 }} />

          {isEditing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Принятые меры</InputLabel>
                <Select
                  multiple
                  value={editMeasureIds}
                  onChange={(e) => setEditMeasureIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  input={<OutlinedInput label="Принятые меры" />}
                  renderValue={(selected) => allMeasures.filter(m => selected.includes(m.id)).map(m => m.name).join(', ')}
                >
                  {allMeasures.map((measure) => (
                    <MenuItem key={measure.id} value={measure.id}>
                      <Checkbox checked={editMeasureIds.indexOf(measure.id) > -1} />
                      <ListItemText primary={measure.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Подробное описание"
                multiline
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary" onClick={handleSave}>Сохранить изменения</Button>
                <Button variant="outlined" color="error" onClick={() => setIsEditing(false)}>Отмена</Button>
              </Box>
            </Box>
          ) : (
            <>
              {incident.measures && incident.measures.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Принятые меры:</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {incident.measures.map(m => <Chip key={m.id} label={m.name} size="small" color="primary" variant="filled" />)}
                  </Stack>
                </Box>
              )}
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Подробное описание:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{incident.description}</Typography>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
