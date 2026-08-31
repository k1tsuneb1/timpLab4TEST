import api from '../api/axiosConfig';
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Button, TextField, Typography, Paper, MenuItem, Alert, 
  FormControl, InputLabel, Select, OutlinedInput, Checkbox, ListItemText 
} from '@mui/material';
import { toast } from 'react-toastify';

const statuses = ['Зафиксирован', 'В работе', 'Закрыт'];

export default function IncidentForm() {
  const navigate = useNavigate();
  
  // Состояния для справочников
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [sources, setSources] = useState([]);
  const [measures, setMeasures] = useState([]);

  // Состояния формы
  const [vulnerabilityId, setVulnerabilityId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [measureIds, setMeasureIds] = useState([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(statuses[0]);

  let currentUserId = '';
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decoded = jwtDecode(token);
      currentUserId = parseInt(decoded.user_id, 10);
    } catch (e) {
      console.error("Ошибка чтения токена");
    }
  }

  useEffect(() => {
    // Загружаем все необходимые справочники параллельно
    Promise.all([
      api.get('/vulnerabilities'),
      api.get('/sources'),
      api.get('/measures')
    ]).then(([vulnRes, sourcesRes, measuresRes]) => {
      setVulnerabilities(vulnRes.data);
      setSources(sourcesRes.data);
      setMeasures(measuresRes.data);
    }).catch(error => {
      console.error('Ошибка при загрузке справочников:', error);
      toast.error('Не удалось загрузить данные для формы');
    });
  }, []);

  const selectedVuln = vulnerabilities.find(v => v.id === Number(vulnerabilityId));
  const calculatedSeverity = selectedVuln ? selectedVuln.base_risk_score * 1.5 : 0;

  const handleMeasuresChange = (event) => {
    const { target: { value } } = event;
    setMeasureIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        employeeId: currentUserId, 
        vulnerabilityId: Number(vulnerabilityId),
        sourceId: Number(sourceId),
        trackingNumber: trackingNumber,
        measureIds: measureIds.map(Number),
        description: description,
        status: status
      };

      await api.post('/incidents', payload);
      toast.success('Инцидент успешно сохранен!');
      navigate('/dashboard');

    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast.error(error.response?.data?.error || 'Произошла ошибка при связи с сервером');
    }
  };

  return (
    <Box sx={{ padding: 4, maxWidth: '800px', margin: '0 auto' }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" color="error.main">
          Регистрация нарушения безопасности
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Заполните форму для фиксации инцидента в цепи поставок. Уровень угрозы будет рассчитан автоматически.
        </Typography>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField 
              label="Трек-номер груза" 
              value={trackingNumber} 
              onChange={(e) => setTrackingNumber(e.target.value)} 
              variant="outlined" 
              fullWidth
            />

            <TextField 
              select 
              label="Источник информации" 
              value={sourceId} 
              onChange={(e) => setSourceId(e.target.value)} 
              variant="outlined" 
              required
              fullWidth
            >
              {sources.length === 0 && <MenuItem disabled value="">Загрузка...</MenuItem>}
              {sources.map((src) => (
                <MenuItem key={src.id} value={src.id}>{src.name}</MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField 
            select 
            label="Тип уязвимости" 
            value={vulnerabilityId} 
            onChange={(e) => setVulnerabilityId(e.target.value)} 
            variant="outlined" 
            required
          >
            {vulnerabilities.length === 0 && <MenuItem disabled value="">Загрузка...</MenuItem>}
            {vulnerabilities.map((vuln) => (
              <MenuItem key={vuln.id} value={vuln.id}>
                {vuln.name} (Риск: {vuln.base_risk_score})
              </MenuItem>
            ))}
          </TextField>

          <FormControl fullWidth>
            <InputLabel>Принятые меры (опционально)</InputLabel>
            <Select
              multiple
              value={measureIds}
              onChange={handleMeasuresChange}
              input={<OutlinedInput label="Принятые меры (опционально)" />}
              renderValue={(selected) => 
                measures.filter(m => selected.includes(m.id)).map(m => m.name).join(', ')
              }
            >
              {measures.map((measure) => (
                <MenuItem key={measure.id} value={measure.id}>
                  <Checkbox checked={measureIds.indexOf(measure.id) > -1} />
                  <ListItemText primary={measure.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Подробное описание инцидента"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            placeholder="Опишите обстоятельства: место, время, сопутствующие факторы..."
          />

          <TextField
            select
            label="Текущий статус"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            fullWidth
          >
            {statuses.map((st) => (
              <MenuItem key={st} value={st}>
                {st}
              </MenuItem>
            ))}
          </TextField>

          {selectedVuln && (
            <Alert severity={calculatedSeverity > 10 ? 'error' : 'warning'}>
              Расчетный уровень критичности: <strong>{calculatedSeverity}</strong> 
              {calculatedSeverity > 10 ? ' (Высокая угроза)' : ' (Средняя угроза)'}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button type="submit" variant="contained" color="error" size="large">
              Зарегистрировать инцидент
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/dashboard')}>
              Отмена
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}