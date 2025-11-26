import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { clearAuth, getUser } from '../utils/auth';
import CalendarView from './Calendar/CalendarView';
import CreateAgendaModal from './CreateAgendaModal';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showCreateAgenda, setShowCreateAgenda] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  // Fetch agendas
  const { data: agendasData, isLoading: agendasLoading } = useQuery({
    queryKey: ['agendas'],
    queryFn: async () => {
      const response = await api.get('/agendas');
      return response.data;
    },
  });

  const agendas = agendasData?.agendas || [];

  // Select first agenda by default
  if (!selectedAgenda && agendas.length > 0) {
    setSelectedAgenda(agendas[0].id);
  }

  const handleLogout = () => {
    clearAuth();
    onLogout();
    navigate('/login');
  };

  const currentAgenda = agendas.find(a => a.id === selectedAgenda);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img 
            src="/synapse_logo.jpg" 
            alt="Synapse" 
            className="sidebar-logo"
          />
          <h2>Synapse</h2>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-email text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <h3 className="nav-title text-sm text-muted">Mis Agendas</h3>
          
          {agendasLoading ? (
            <div className="loading-agendas">Cargando...</div>
          ) : agendas.length === 0 ? (
            <p className="text-sm text-muted">No tienes agendas</p>
          ) : (
            <ul className="agenda-list">
              {agendas.map(agenda => (
                <li key={agenda.id}>
                  <button
                    className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}
                    onClick={() => setSelectedAgenda(agenda.id)}
                  >
                    <span 
                      className="agenda-color" 
                      style={{ backgroundColor: agenda.color }}
                    />
                    <span className="agenda-name">{agenda.name}</span>
                    <span className="agenda-badge">{agenda._count?.events || 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button 
            className="btn btn-primary btn-block mt-2"
            onClick={() => setShowCreateAgenda(true)}
          >
            + Nueva Agenda
          </button>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="btn btn-secondary btn-block"
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {currentAgenda ? (
          <CalendarView agenda={currentAgenda} />
        ) : (
          <div className="empty-state">
            <h2>Bienvenido a Synapse Agenda</h2>
            <p className="text-muted">
              Selecciona una agenda o crea una nueva para empezar
            </p>
          </div>
        )}
      </main>

      {/* Create Agenda Modal */}
      {showCreateAgenda && (
        <CreateAgendaModal onClose={() => setShowCreateAgenda(false)} />
      )}
    </div>
  );
}

export default Dashboard;
