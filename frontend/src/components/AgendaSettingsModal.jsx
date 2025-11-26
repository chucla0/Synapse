import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import './AgendaSettingsModal.css';

const ROLES_BY_TYPE = {
  LABORAL: ['CHIEF', 'EMPLOYEE'],
  EDUCATIVA: ['PROFESSOR', 'STUDENT'],
  FAMILIAR: ['EDITOR', 'VIEWER'],
  COLABORATIVA: ['EDITOR', 'VIEWER'], // Viewer for collab is a good addition
};

function AgendaSettingsModal({ agenda, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({ name: agenda.name, description: agenda.description || '' });
  const [inviteEmail, setInviteEmail] = useState('');
  
  const availableRoles = useMemo(() => ROLES_BY_TYPE[agenda.type] || [], [agenda.type]);
  const [inviteRole, setInviteRole] = useState(availableRoles[1] || availableRoles[0]); // Default to lesser role

  // Fetch full, fresh agenda details
  const { data: agendaData, isLoading } = useQuery({
    queryKey: ['agendaDetails', agenda.id],
    queryFn: async () => (await api.get(`/agendas/${agenda.id}`)).data,
  });
  const fullAgenda = agendaData?.agenda;
  const userRole = fullAgenda?.userRole;

  // Mutations
  const updateAgendaMutation = useMutation({
    mutationFn: (updatedData) => api.put(`/agendas/${agenda.id}`, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose(); // Close modal after successful update and query invalidation
    },
  });
  const deleteAgendaMutation = useMutation({
    mutationFn: () => api.delete(`/agendas/${agenda.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
  });
  const addUserMutation = useMutation({
    mutationFn: (data) => api.post(`/agendas/${agenda.id}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaDetails', agenda.id] });
      setInviteEmail('');
    },
  });
  const removeUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/agendas/${agenda.id}/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendaDetails', agenda.id] }),
  });
  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/agendas/${agenda.id}/users/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendaDetails', agenda.id] }),
  });

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    updateAgendaMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la agenda "${agenda.name}"? Esta acción es irreversible.`)) {
      deleteAgendaMutation.mutate();
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    addUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };
  
  const usersByRole = useMemo(() => {
    if (!fullAgenda) return {};
    const grouped = { OWNER: [fullAgenda.owner] };
    fullAgenda.agendaUsers.forEach(member => {
      if (!grouped[member.role]) {
        grouped[member.role] = [];
      }
      grouped[member.role].push(member.user);
    });
    return grouped;
  }, [fullAgenda]);

  // Permission checks
  const canEditGeneral = userRole === 'OWNER';
  const canInvite = userRole === 'OWNER' && agenda.type !== 'PERSONAL';
  const canChangeRole = (targetUserRole) => {
    if (userRole === 'OWNER' && agenda.type !== 'EDUCATIVA') return true;
    if (userRole === 'CHIEF' && agenda.type === 'LABORAL' && targetUserRole === 'EMPLOYEE') return true;
    return false;
  };
  const canRemoveUser = (targetUserRole) => {
    if (userRole === 'OWNER') return true;
    if (userRole === 'CHIEF' && agenda.type === 'LABORAL' && targetUserRole === 'EMPLOYEE') return true;
    return false;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('agendaSettingsTitle', { name: agenda.name })}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>{t('generalTab')}</button>
          {agenda.type !== 'PERSONAL' && (
            <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>{t('membersTab')}</button>
          )}
        </div>

        <div className="tab-content">
          {isLoading ? <p>Cargando...</p> : (
            <>
              {/* General Tab */}
              {activeTab === 'general' && (
                <form onSubmit={handleGeneralSubmit}>
                  <div className="form-group">
                    <label>{t('agendaTypeLabel')}</label>
                    <input type="text" className="input" value={agenda.type} disabled readOnly />
                  </div>
                  <div className="form-group">
                    <label htmlFor="agenda-name">{t('agendaNameLabel_settings')}</label>
                    <input type="text" id="agenda-name" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={!canEditGeneral} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="agenda-desc">{t('descriptionLabel')}</label>
                    <textarea id="agenda-desc" className="input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} disabled={!canEditGeneral} />
                  </div>
                  {canEditGeneral && (
                    <div className="modal-actions">
                      <button type="submit" className="btn btn-primary" disabled={updateAgendaMutation.isPending}>
                        {updateAgendaMutation.isPending ? t('savingButton') : t('saveChangesButton_agenda')}
                      </button>
                    </div>
                  )}

                  {/* Danger Zone */}
                  {canEditGeneral && (
                    <div className="danger-zone">
                      <h4>{t('dangerZoneTitle')}</h4>
                      <div className="danger-item">
                        <div>
                          <strong>{t('deleteAgendaTitle')}</strong>
                          <p>{t('deleteAgendaDescription')}</p>
                        </div>
                        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteAgendaMutation.isPending}>{t('deleteButton')}</button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                agenda.type === 'PERSONAL' ? (
                  <p className="text-muted text-center">No se pueden gestionar miembros en agendas personales.</p>
                ) : (
                  <div>
                    {canInvite && (
                      <form onSubmit={handleInvite} className="invite-form">
                        <h3>{t('inviteUserTitle')}</h3>
                        <div className="form-row">
                          <input type="email" className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" disabled={addUserMutation.isPending} />
                          {agenda.type !== 'COLABORATIVA' && (
                            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                              {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                          )}
                          <button type="submit" className="btn btn-primary" disabled={!inviteEmail || addUserMutation.isPending}>
                            {addUserMutation.isPending ? t('invitingButton') : t('inviteButton')}
                          </button>
                        </div>
                        {addUserMutation.isError && <p className="error-message mt-1">{addUserMutation.error.response?.data?.message || 'Error al invitar'}</p>}
                      </form>
                    )}
                    <div className="user-list">
                      <h3>{t('membersCount', { count: fullAgenda?.agendaUsers.length + 1 })}</h3>
                      {Object.entries(usersByRole).map(([role, users]) => (
                        <div key={role}>
                          <h4 className="role-group-title">{role}</h4>
                          {users.map(user => (
                            <div key={user.id} className="user-list-item">
                              <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email text-muted">{user.email}</span>
                              </div>
                              <div className="user-actions">
                                {role !== 'OWNER' && (
                                  <>
                                    <select 
                                      className="role-select" 
                                      value={fullAgenda?.agendaUsers.find(au => au.userId === user.id)?.role} 
                                      onChange={(e) => updateUserRoleMutation.mutate({ userId: user.id, role: e.target.value })} 
                                      disabled={!canChangeRole(fullAgenda?.agendaUsers.find(au => au.userId === user.id)?.role)}
                                    >
                                      {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {canRemoveUser(fullAgenda?.agendaUsers.find(au => au.userId === user.id)?.role) && (
                                      <button className="btn-remove" onClick={() => removeUserMutation.mutate(user.id)} disabled={removeUserMutation.isPending} title={t('removeUserButton_title')}>×</button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgendaSettingsModal;
