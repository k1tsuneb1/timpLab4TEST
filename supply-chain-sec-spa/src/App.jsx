import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IncidentForm from './pages/IncidentForm';
import IncidentDetails from './pages/IncidentDetails';
import AdminPanel from './pages/AdminPanel';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Простой защищенный роут
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Защищенные маршруты для логистов/аудиторов */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/incidents/:id" element={
          <ProtectedRoute>
            <IncidentDetails />
          </ProtectedRoute>        
        } />
        
        <Route path="/incidents/new" element={
          <ProtectedRoute>
            <IncidentForm />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />

        {/* Редирект по умолчанию */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
      
      {/* Компонент для всплывающих уведомлений об ошибках/успехе */}
      <ToastContainer position="bottom-right" />
    </Router>
  );
}

export default App;