import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Verify from './pages/Auth/Verify';
import Dashboard from './pages/Dashboard/Dashboard';
import GoogleCallback from './pages/Auth/GoogleCallback';
import SetPassword from './pages/Auth/SetPassword';
import { getToken } from './utils/auth';
import { DateFnsLocaleProvider } from './contexts/LocaleContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';

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
    <SettingsProvider>
      <DateFnsLocaleProvider>
        <SocketProvider>
          <ToastProvider>
            <Routes>
              <Route
                path="/login"
                element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
              />
              <Route
                path="/register"
                element={!isAuthenticated ? <Register onRegister={handleLogin} /> : <Navigate to="/dashboard" />}
              />
              <Route path="/verify" element={<Verify onLogin={handleLogin} />} />
              <Route
                path="/dashboard/*"
                element={isAuthenticated ? <Dashboard key={sessionKey} sessionKey={sessionKey} onLogout={handleLogout} /> : <Navigate to="/login" />}
              />
              <Route
                path="/"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
              />
              <Route path="/google-callback" element={<GoogleCallback onLogin={handleLogin} isAuthenticated={isAuthenticated} />} />
              <Route path="/set-password" element={<SetPassword onLogin={handleLogin} />} />
              {/* Catch-all route for 404 handling */}
              <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
            </Routes>
          </ToastProvider>
        </SocketProvider>
      </DateFnsLocaleProvider>
    </SettingsProvider>
  );
}

export default App;
