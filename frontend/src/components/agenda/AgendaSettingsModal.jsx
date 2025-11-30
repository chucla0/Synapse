import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import ConfirmDeleteModal from '../ui/ConfirmDeleteModal';
import MultiEmailInput from '../ui/MultiEmailInput';
import './AgendaSettingsModal.css';

const ROLES_BY_TYPE = {
  LABORAL: ['CHIEF', 'EMPLOYEE'],
  EDUCATIVA: ['PROFESSOR', 'STUDENT'],
  FAMILIAR: ['EDITOR', 'VIEWER'],
  COLABORATIVA: ['EDITOR', 'VIEWER'],
};

function AgendaSettingsModal({ agenda, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({ name: agenda.name, description: agenda.description || '' });
  const [inviteEmails, setInviteEmails] = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  const availableRoles = useMemo(() => ROLES_BY_TYPE[agenda.type] || [], [agenda.type]);
  const [inviteRole, setInviteRole] = useState(availableRoles[1] || availableRoles[0]);

  // Fetch full, fresh agenda details
  const { data: agendaData, isLoading } = useQuery({
    queryKey: ['agendaDetails', agenda.id],
    queryFn: async () => (await api.get(`/agendas/${agenda.id}`)).data,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const fullAgenda = agendaData?.agenda;
  const userRole = fullAgenda?.userRole;

  // Mutations
  const updateAgendaMutation = useMutation({
    mutationFn: (updatedData) => api.put(`/agendas/${agenda.id}`, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
  });

  const deleteAgendaMutation = useMutation({
    mutationFn: () => api.delete(`/agendas/${agenda.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
  });

  const leaveAgendaMutation = useMutation({
    mutationFn: () => api.post(`/agendas/${agenda.id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
  });

  const addUserMutation = useMutation({
    mutationFn: (data) => api.post(`/agendas/${agenda.id}/users`, data),
    onSuccess: () => {
      // Alert handled in handleInvite
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/agendas/${agenda.id}/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaDetails', agenda.id] });
      setUserToRemove(null);
    },
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
    setShowConfirmDelete(true);
  };

  const handleLeave = () => {
    setShowConfirmLeave(true);
  };

  const executeDelete = () => {
    deleteAgendaMutation.mutate(undefined, {
      onSuccess: () => {
        setShowConfirmDelete(false);
        onClose();
      }
    });
  };

  const executeLeave = () => {
    leaveAgendaMutation.mutate(undefined, {
      onSuccess: () => {
        setShowConfirmLeave(false);
        onClose();
      }
    });
  };

  const handleRemoveUser = (userId) => {
    setUserToRemove(userId);
  };

  const executeRemoveUser = () => {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (inviteEmails.length === 0) return;

    const promises = inviteEmails.map(email =>
      addUserMutation.mutateAsync({ email, role: inviteRole })
    );

    try {
      await Promise.all(promises);
      setInviteEmails([]);
      alert(t('invitationSentSuccess', 'Invitaciones enviadas correctamente'));
      queryClient.invalidateQueries({ queryKey: ['agendaDetails', agenda.id] });
    } catch (error) {
      console.error("Error sending invites", error);
    }
  };

  const sortedMembers = useMemo(() => {
    if (!fullAgenda) return [];

    const members = [];

    // Helper to add member
    const addMember = (user, role) => {
      members.push({ user, role, isCurrentUser: user.id === currentUser.id });
    };

    // Add owner
    if (fullAgenda.owner) {
      addMember(fullAgenda.owner, 'OWNER');
    }

    // Add other members
    fullAgenda.agendaUsers.forEach(au => {
      if (au.user.id !== fullAgenda.owner?.id) {
        addMember(au.user, au.role);
      }
    });

    // Sort members
    return members.sort((a, b) => {
      // 1. Current user first
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;

      // 2. Role hierarchy
      const getRoleRank = (role) => {
        if (role === 'OWNER') return 0;
        if (['CHIEF', 'PROFESSOR', 'EDITOR'].includes(role)) return 1;
        return 2;
      };

      const rankA = getRoleRank(a.role);
      const rankB = getRoleRank(b.role);

      if (rankA !== rankB) return rankA - rankB;

      // 3. Name alphabetical fallback
      return a.user.name.localeCompare(b.user.name);
    });
  }, [fullAgenda, currentUser.id]);

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
    if (userRole === 'PROFESSOR' && agenda.type === 'EDUCATIVA' && targetUserRole === 'STUDENT') return true;
    return false;
  }

  const renderUserItem = (member) => {
    const { user, role, isCurrentUser } = member;
    const canEditThisUser = !isCurrentUser && canChangeRole(role);
    const canRemoveThisUser = !isCurrentUser && canRemoveUser(role);

    return (
      <div key={user.id} className="user-list-item">
        <div className="user-info-container">
          <div className="user-avatar-wrapper">
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`}
                alt={user.name}
                className="user-avatar-circle"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-text-info">
            <span className="user-name-text">
              {user.name} {isCurrentUser && <span className="you-suffix">({t('you', 'Tú')})</span>}
            </span>
            <span className="user-email-text">{user.email}</span>
          </div>
        </div>

        <div className="user-action-container">
          {canEditThisUser ? (
            <div className="role-actions">
              <select
                className="role-select"
                value={role}
                onChange={(e) => updateUserRoleMutation.mutate({ userId: user.id, role: e.target.value })}
              >
                {availableRoles.map(r => <option key={r} value={r}>{t(`roles.${r}`, r)}</option>)}
              </select>
              {canRemoveThisUser && (
                <button className="btn-remove-user" onClick={() => handleRemoveUser(user.id)} title={t('removeUser')}>
                  &times;
                </button>
              )}
            </div>
          ) : (
            <span className="role-badge-text">
              {t(`roles.${role}`, role)}
            </span>
          )}
        </div>
      </div>
    );
  };

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
          {isLoading ? <p>{t('loading')}</p> : (
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
                    <input type="text" id="agenda-name" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={!canEditGeneral} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="agenda-desc">{t('descriptionLabel')}</label>
                    <textarea id="agenda-desc" className="input" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={!canEditGeneral} />
                  </div>
                  {canEditGeneral && (
                    <div className="modal-actions">
                      <button type="submit" className="btn btn-primary" disabled={updateAgendaMutation.isPending}>
                        {updateAgendaMutation.isPending ? t('savingButton') : t('saveChangesButton_agenda')}
                      </button>
                    </div>
                  )}

                  {/* Danger Zone */}
                  <div className="danger-zone">
                    <h4>{t('dangerZone')}</h4>
                    {canEditGeneral ? (
                      <div className="danger-item">
                        <div>
                          <strong>{t('deleteAgendaTitle')}</strong>
                          <p>{t('deleteAgendaDescription')}</p>
                        </div>
                        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteAgendaMutation.isPending}>{t('deleteButton')}</button>
                      </div>
                    ) : (
                      <div className="danger-item">
                        <div>
                          <strong>{t('leaveAgenda')}</strong>
                          <p>{t('leaveAgendaDescription', 'Salir de esta agenda permanentemente.')}</p>
                        </div>
                        <button type="button" className="btn btn-danger" onClick={handleLeave} disabled={leaveAgendaMutation.isPending}>{t('leave')}</button>
                      </div>
                    )}
                  </div>
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
                        <div className="invite-row-container">
                          <div className="invite-input-wrapper">
                            <MultiEmailInput
                              emails={inviteEmails}
                              onChange={setInviteEmails}
                              placeholder="email@ejemplo.com"
                              disabled={addUserMutation.isPending}
                            />
                          </div>

                          <div className="invite-actions-wrapper">
                            {agenda.type !== 'COLABORATIVA' && (
                              <select
                                className="role-select-compact"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                disabled={addUserMutation.isPending}
                              >
                                {availableRoles.map(role => <option key={role} value={role}>{t(`roles.${role}`, role)}</option>)}
                              </select>
                            )}
                            <button
                              type="submit"
                              className="btn btn-primary btn-compact"
                              disabled={inviteEmails.length === 0 || addUserMutation.isPending}
                            >
                              {addUserMutation.isPending ? t('invitingButton') : t('inviteButton')}
                            </button>
                          </div>
                        </div>
                        {addUserMutation.isError && <p className="error-message mt-1">{addUserMutation.error.response?.data?.message || 'Error al invitar'}</p>}
                      </form>
                    )}
                    <div className="user-list">
                      <h3>{t('membersCount', { count: sortedMembers.length })}</h3>
                      <div className="members-list-container">
                        {sortedMembers.map(member => renderUserItem(member))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmDeleteModal
          message={t('confirmDeleteAgenda', { name: agenda.name })}
          onConfirm={executeDelete}
          onCancel={() => {
            setShowConfirmDelete(false);
            setDeleteConfirmationName('');
          }}
          isDeleting={deleteAgendaMutation.isPending}
          confirmText={t('deleteButton')}
          deletingText={t('deletingAgendaButton', 'Eliminando...')}
          disabled={deleteConfirmationName !== agenda.name}
        >
          <div className="mt-4">
            <p className="text-sm text-muted mb-2">
              {t('typeAgendaNameConfirm', 'Escribe el nombre de la agenda para confirmar:')} <strong>{agenda.name}</strong>
            </p>
            <input
              type="text"
              className="input"
              placeholder={agenda.name}
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
            />
          </div>
        </ConfirmDeleteModal>
      )}

      {showConfirmLeave && (
        <ConfirmDeleteModal
          message={t('confirmLeaveAgenda')}
          onConfirm={executeLeave}
          onCancel={() => setShowConfirmLeave(false)}
          isDeleting={leaveAgendaMutation.isPending}
          confirmText={t('leave')}
          deletingText={t('leaving', 'Saliendo...')}
        />
      )}

      {userToRemove && (
        <ConfirmDeleteModal
          message={t('confirmRemoveUser')}
          onConfirm={executeRemoveUser}
          onCancel={() => setUserToRemove(null)}
          isDeleting={removeUserMutation.isPending}
          confirmText={t('remove')}
          deletingText={t('removing', 'Eliminando...')}
        />
      )}
    </div>
  );
}

export default AgendaSettingsModal;
