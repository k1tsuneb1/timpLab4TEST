import api from '../api/axiosConfig';
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  MenuItem,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';

const statuses = ['Зафиксирован', 'В обработке', 'Решен'];

export default function IncidentForm() {
  const navigate = useNavigate();
  
  // 1. Все хуки состояния (useState) всегда должны быть в самом верху!
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [vulnerabilityId, setVulnerabilityId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(statuses[0]);

  // 2. Достаем ID пользователя из токена
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

  // 3. Загружаем список уязвимостей при открытии компонента
  useEffect(() => {
    api.get('/vulnerabilities')
      .then(response => {
        setVulnerabilities(response.data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке уязвимостей:', error);
        toast.error('Не удалось загрузить список уязвимостей');
      });
  }, []);

  // 4. Безопасный поиск (приводим ID к числу, чтобы не было конфликтов со строками)
  const selectedVuln = vulnerabilities.find(v => v.id === Number(vulnerabilityId));
  const calculatedSeverity = selectedVuln ? selectedVuln.base_risk_score * 1.5 : 0;

  // 5. Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        employeeId: currentUserId, 
        vulnerabilityId: Number(vulnerabilityId), // Гарантируем, что на бэкенд уйдет число
        description: description,
        status: status
      };

      await api.post('/incidents', payload);
      toast.success('Инцидент успешно сохранен в базе данных!');
      navigate('/dashboard');

    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast.error(
        error.response?.data?.error || 'Произошла ошибка при связи с сервером'
      );
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

          <TextField 
            select 
            label="Тип уязвимости" 
            value={vulnerabilityId} 
            onChange={(e) => setVulnerabilityId(e.target.value)} 
            variant="outlined" 
            required
          >
            {/* Добавляем пустой пункт по умолчанию на случай, если данные еще грузятся */}
            {vulnerabilities.length === 0 && (
               <MenuItem disabled value="">Загрузка...</MenuItem>
            )}
            
            {vulnerabilities.map((vuln) => (
              <MenuItem key={vuln.id} value={vuln.id}>
                {vuln.name} (Риск: {vuln.base_risk_score})
              </MenuItem>
            ))}
          </TextField>

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
            <Button 
              type="submit" 
              variant="contained" 
              color="error" 
              size="large"
            >
              Зарегистрировать инцидент
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/dashboard')}
            >
              Отмена
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}