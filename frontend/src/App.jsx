import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard';
import { getToken } from './utils/auth';
import { DateFnsLocaleProvider } from './contexts/LocaleContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [sessionKey, setSessionKey] = useState(0); // Key to force re-mount
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect now simply handles the initial loading state
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setSessionKey(prev => prev + 1);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSessionKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <DateFnsLocaleProvider>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register onRegister={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard/*" 
          element={isAuthenticated ? <Dashboard key={sessionKey} sessionKey={sessionKey} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </DateFnsLocaleProvider>
  );
}

export default App;
