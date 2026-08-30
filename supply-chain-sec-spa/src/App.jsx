import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Импорт страниц
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IncidentForm from './pages/IncidentForm';
import AdminPanel from './pages/AdminPanel';
import IncidentDetails from './pages/IncidentDetails'; 

import Layout from './components/Layout'; // Наш новый каркас
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Создаем красивую строгую тему для приложения
const theme = createTheme({
  palette: {
    primary: { main: '#2563eb' },   // Глубокий синий (для главных кнопок)
    secondary: { main: '#475569' }, // Графитовый серый
    background: {
      default: '#f4f6f8',           // Светло-серый фон для всего сайта (вместо белого)
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',        // Выключаем стандартный КАПСЛОК на кнопках MUI
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 8,                // Слегка скругляем углы у всех кнопок и карточек
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline применяет цвет фона из темы ко всему экрану */}
      <CssBaseline /> 
      
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Все остальные маршруты обернуты в Layout */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incidents/new" element={<IncidentForm />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/incidents/:id" element={<IncidentDetails />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
      
      <ToastContainer position="bottom-right" />
    </ThemeProvider>
  );
}

export default App;