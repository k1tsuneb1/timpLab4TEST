import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: '/api',
});

// 1. Перехватчик ЗАПРОСОВ (прикрепляет токен, если он есть)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Перехватчик ОТВЕТОВ (обрабатывает ошибки безопасности)
api.interceptors.response.use(
  (response) => {
    // Если запрос прошел успешно (статусы 2xx), просто возвращаем данные
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // Ошибка 401: Нет токена, или он просрочен, или подделан
      if (status === 401) {
        // Очищаем старый токен
        localStorage.removeItem('token');
        
        // Предотвращаем бесконечный цикл редиректов, если мы уже на странице логина
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
            toast.error('Сессия истекла. Пожалуйста, войдите снова.');
            // Принудительно кидаем на форму входа
            window.location.href = '/login';
        }
      } 
      // Ошибка 403: Токен верный, но не хватает прав (например, логист жмет "Удалить")
      else if (status === 403) {
        toast.error('Доступ запрещен! У вас нет прав для этого действия.');
      }
    }
    
    // Пробрасываем ошибку дальше, чтобы конкретные компоненты могли ее обработать
    return Promise.reject(error);
  }
);

export default api;
