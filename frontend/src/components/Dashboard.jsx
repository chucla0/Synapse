import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { clearAuth, getUser } from '../utils/auth';
import CalendarView from './Calendar/CalendarView';
import CreateAgendaModal from './CreateAgendaModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import AgendaSettingsModal from './AgendaSettingsModal';
import './Dashboard.css';

const lngs = {
  en: { nativeName: 'English' },
  es: { nativeName: 'Español' },
  ca: { nativeName: 'Català' }
};

function Dashboard({ onLogout }) {
  const { t, i18n } = useTranslation();
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showCreateAgenda, setShowCreateAgenda] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const navigate = useNavigate();
  const user = getUser();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isAnyModalOpen = showCreateAgenda || showProfileSettings || editingAgenda;

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
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
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
            {user?.avatar ? (
              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`} alt={user.name} />
            ) : (
              <div className="user-avatar-initials">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-email text-sm text-muted">{user?.email}</p>
          </div>
          <button 
            className="btn-settings"
            onClick={() => setShowProfileSettings(true)}
            title="Configuración de perfil"
          >
            ⚙️
          </button>
        </div>

        <nav className="sidebar-nav">
          <h3 className="nav-title text-sm text-muted">{t('myAgendas')}</h3>
          
          {agendasLoading ? (
            <div className="loading-agendas">Cargando...</div>
          ) : agendas.length === 0 ? (
            <p className="text-sm text-muted">No tienes agendas</p>
          ) : (
            <ul className="agenda-list">
              {agendas.map(agenda => (
                <li key={agenda.id} className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}>
                  <div className="agenda-item-main" onClick={() => setSelectedAgenda(agenda.id)}>
                    <span 
                      className="agenda-color" 
                      style={{ backgroundColor: agenda.color }}
                    />
                    <span className="agenda-name">{agenda.name}</span>
                  </div>
                  {/* Settings button */}
                  <button 
                    className="btn-agenda-settings"
                    onClick={() => setEditingAgenda(agenda)}
                    title="Configuración de agenda"
                  >
                    ⚙️
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button 
            className="btn btn-primary btn-block mt-2"
            onClick={() => setShowCreateAgenda(true)}
          >
            {t('newAgenda')}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="language-switcher">
            <select 
              value={i18n.resolvedLanguage} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="input"
            >
              {Object.keys(lngs).map((lng) => (
                <option key={lng} value={lng}>
                  {lngs[lng].nativeName}
                </option>
              ))}
            </select>
          </div>
          <button 
            className="btn btn-secondary btn-block"
            onClick={handleLogout}
          >
                            {t('logout')}
                              </button>
                            </div>
                          </aside>
                    
                          <button
                            className="btn-sidebar-toggle"
                            onClick={toggleSidebar}
                            title={isSidebarOpen ? "Cerrar barra lateral" : "Abrir barra lateral"}
                            disabled={isAnyModalOpen}
                          >
                            {isSidebarOpen ? '❮' : '❯'} {/* Simple arrow icons for now */}
                          </button>      {/* Main Content */}
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

      {/* Modals */}
      {showCreateAgenda && (
        <CreateAgendaModal onClose={() => setShowCreateAgenda(false)} />
      )}
      {showProfileSettings && (
        <ProfileSettingsModal onClose={() => setShowProfileSettings(false)} />
      )}
      {editingAgenda && (
        <AgendaSettingsModal 
          agenda={editingAgenda}
          onClose={() => setEditingAgenda(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
