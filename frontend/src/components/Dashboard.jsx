import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { clearAuth, getUser } from '../utils/auth';
import CalendarView from './Calendar/CalendarView';
import CreateAgendaModal from './CreateAgendaModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import AgendaSettingsModal from './AgendaSettingsModal';
import WebSettingsModal from './WebSettingsModal';
import Home from './Home';
import './Dashboard.css';

const lngs = {
  en: { nativeName: 'English' },
  es: { nativeName: 'Español' },
  ca: { nativeName: 'Català' }
};

const typeOrder = {
  'PERSONAL': 1,
  'LABORAL': 2,
  'EDUCATIVA': 3,
  'SOCIAL': 4,
  'COLABORATIVA': 5,
};

function Dashboard({ onLogout, sessionKey }) {
  const { t, i18n } = useTranslation();
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showCreateAgenda, setShowCreateAgenda] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showWebSettings, setShowWebSettings] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name_asc'); // 'name_asc', 'name_desc', 'date_desc', 'date_asc'
  const [currentView, setCurrentView] = useState('agendas'); // 'home', 'agendas'
  const navigate = useNavigate();
  const user = getUser();

  const { accentColor } = useTheme();
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isAnyModalOpen = showCreateAgenda || showProfileSettings || showWebSettings || editingAgenda;

  // Fetch agendas
  const { data: agendasData, isLoading: agendasLoading } = useQuery({
    queryKey: ['agendas', sessionKey],
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

  const filteredAgendas = agendas.filter(agenda => 
    agenda.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    switch (sortOrder) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'date_desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'date_asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'type':
        const typeA = typeOrder[a.type] || 99;
        const typeB = typeOrder[b.type] || 99;
        const typeCompare = typeA - typeB;
        return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Group agendas by type if sortOrder is 'type'
  const groupedAgendas = sortOrder === 'type' 
    ? filteredAgendas.reduce((acc, agenda) => {
        const type = agenda.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(agenda);
        return acc;
      }, {})
    : null;

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
            title={t('profileSettings')}
          >
            ⚙️
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="main-nav-links">
            <button className={`nav-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>
              {t('homeTitle', 'Inicio')}
            </button>
            <button className={`nav-link ${currentView === 'agendas' ? 'active' : ''}`} onClick={() => setCurrentView('agendas')}>
              {t('myAgendas')}
            </button>
          </div>

          {currentView === 'agendas' && (
            <>
              <div className="agenda-search-container">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <div className="sort-dropdown-container">
                  <div className="custom-dropdown">
                    <button 
                      className="dropdown-toggle"
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      style={{borderColor: accentColor}}
                    >
                      {sortOrder === 'name_asc' && t('sortBy_name_asc')}
                      {sortOrder === 'name_desc' && t('sortBy_name_desc')}
                      {sortOrder === 'date_desc' && t('sortBy_date_desc')}
                      {sortOrder === 'date_asc' && t('sortBy_date_asc')}
                      {sortOrder === 'type' && t('sortBy_type')}
                      <span className="dropdown-arrow">▼</span>
                    </button>
                    {showSortDropdown && (
                      <ul className="dropdown-menu">
                        <li 
                          className={`dropdown-item ${sortOrder === 'name_asc' ? 'active' : ''}`}
                          onClick={() => {
                            setSortOrder('name_asc');
                            setShowSortDropdown(false);
                          }}
                          style={sortOrder === 'name_asc' ? {backgroundColor: accentColor, color: 'white'} : {}}
                        >
                          {t('sortBy_name_asc')}
                        </li>
                        <li 
                          className={`dropdown-item ${sortOrder === 'name_desc' ? 'active' : ''}`}
                          onClick={() => {
                            setSortOrder('name_desc');
                            setShowSortDropdown(false);
                          }}
                          style={sortOrder === 'name_desc' ? {backgroundColor: accentColor, color: 'white'} : {}}
                        >
                          {t('sortBy_name_desc')}
                        </li>
                        <li 
                          className={`dropdown-item ${sortOrder === 'date_desc' ? 'active' : ''}`}
                          onClick={() => {
                            setSortOrder('date_desc');
                            setShowSortDropdown(false);
                          }}
                          style={sortOrder === 'date_desc' ? {backgroundColor: accentColor, color: 'white'} : {}}
                        >
                          {t('sortBy_date_desc')}
                        </li>
                        <li 
                          className={`dropdown-item ${sortOrder === 'date_asc' ? 'active' : ''}`}
                          onClick={() => {
                            setSortOrder('date_asc');
                            setShowSortDropdown(false);
                          }}
                          style={sortOrder === 'date_asc' ? {backgroundColor: accentColor, color: 'white'} : {}}
                        >
                          {t('sortBy_date_asc')}
                        </li>
                        <li 
                          className={`dropdown-item ${sortOrder === 'type' ? 'active' : ''}`}
                          onClick={() => {
                            setSortOrder('type');
                            setShowSortDropdown(false);
                          }}
                          style={sortOrder === 'type' ? {backgroundColor: accentColor, color: 'white'} : {}}
                        >
                          {t('sortBy_type')}
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              
              {agendasLoading ? (
                <div className="loading-agendas">{t('loading')}</div>
              ) : filteredAgendas.length === 0 ? (
                <p className="text-sm text-muted">{t('noAgendasFound')}</p>
              ) : sortOrder === 'type' ? (
                Object.entries(groupedAgendas).map(([type, typeAgendas]) => (
                  <div key={type} className="agenda-group">
                    <h4 className="agenda-group-title">{t(`agendaType_${type}`, type)}</h4>
                    <ul className="agenda-list">
                      {typeAgendas.map(agenda => (
                        <li key={agenda.id} className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}>
                          <div className="agenda-item-main" onClick={() => setSelectedAgenda(agenda.id)}>
                            <span 
                              className="agenda-color" 
                              style={{ backgroundColor: agenda.color }}
                            />
                            <span className="agenda-name">{agenda.name}</span>
                          </div>
                          <button 
                            className="btn-agenda-settings"
                            onClick={() => setEditingAgenda(agenda)}
                            title={t('agendaSettings')}
                          >
                            ⚙️
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul className="agenda-list">
                  {filteredAgendas.map(agenda => (
                    <li key={agenda.id} className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}>
                      <div className="agenda-item-main" onClick={() => setSelectedAgenda(agenda.id)}>
                        <span 
                          className="agenda-color" 
                          style={{ backgroundColor: agenda.color }}
                        />
                        <span className="agenda-name">{agenda.name}</span>
                      </div>
                      <button 
                        className="btn-agenda-settings"
                        onClick={() => setEditingAgenda(agenda)}
                        title={t('agendaSettings')}
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
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="language-switcher">
            <div className="custom-dropdown">
              <button 
                className="dropdown-toggle"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                {lngs[i18n.resolvedLanguage]?.nativeName}
                <span className="dropdown-arrow">▼</span>
              </button>
              {showLanguageDropdown && (
                <ul className="dropdown-menu">
                  {Object.keys(lngs).map((lng) => (
                    <li 
                      key={lng} 
                      className={`dropdown-item dropdown-item-${lng} ${i18n.resolvedLanguage === lng ? 'active' : ''}`}
                      onClick={() => {
                        i18n.changeLanguage(lng);
                        setShowLanguageDropdown(false);
                      }}
                    >
                      {lngs[lng].nativeName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-block"
            onClick={() => setShowWebSettings(true)}
            title={t('webSettingsTitle')}
          >
            🎨 {t('webSettingsButton')}
          </button>
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
        title={isSidebarOpen ? t('closeSidebar') : t('openSidebar')}
        disabled={isAnyModalOpen}
      >
        {isSidebarOpen ? '❮' : '❯'} {/* Simple arrow icons for now */}
      </button>

      {/* Main Content */}
      <main className="main-content">
        {currentView === 'home' ? (
          <Home sessionKey={sessionKey} />
        ) : currentAgenda ? (
          <CalendarView agenda={currentAgenda} />
        ) : (
          <div className="empty-state">
            <h2>{t('welcomeTitle')}</h2>
            <p className="text-muted">
              {t('welcomeSubtitle')}
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
      {showWebSettings && (
        <WebSettingsModal onClose={() => setShowWebSettings(false)} />
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
