import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import UserProfileModal from '../user/UserProfileModal';
import MultiEmailInput from '../ui/MultiEmailInput';
import { useToast } from '../../contexts/ToastContext';
import './AgendaSettingsModal.css';

function AgendaSettingsModal({ agenda, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const [activeTab, setActiveTab] = useState('general');
  const [agendaName, setAgendaName] = useState(agenda?.name || '');
  const [agendaDescription, setAgendaDescription] = useState(agenda?.description || '');
  const [inviteEmails, setInviteEmails] = useState([]);
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveUserConfirm, setShowRemoveUserConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Update local state if agenda prop changes
  useEffect(() => {
    if (agenda) {
      setAgendaName(agenda.name);
      setAgendaDescription(agenda.description || '');
    }
  }, [agenda]);

  const { addToast } = useToast();

  const updateAgendaMutation = useMutation({
    mutationFn: (data) => api.put(`/agendas/${agenda.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      addToast(t('agendaUpdatedSuccess', 'Agenda actualizada correctamente'), 'success');
    },
    onError: (error) => {
      console.error("Failed to update agenda", error);
      addToast(t('error_updating_agenda', 'Error al actualizar la agenda'), 'error');
    }
  });

  const deleteAgendaMutation = useMutation({
    mutationFn: () => api.delete(`/agendas/${agenda.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
      addToast(t('agendaDeletedSuccess', 'Agenda eliminada correctamente'), 'success');
    },
    onError: (error) => {
      console.error("Failed to delete agenda", error);
      addToast(t('error_deleting_agenda', 'Error al eliminar la agenda'), 'error');
    }
  });

  const leaveAgendaMutation = useMutation({
    mutationFn: () => api.post(`/agendas/${agenda.id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
      addToast(t('leftAgendaSuccess', 'Has salido de la agenda correctamente'), 'success');
    },
    onError: (error) => {
      console.error("Failed to leave agenda", error);
      addToast(t('error_leaving_agenda', 'Error al salir de la agenda'), 'error');
    }
  });

  // We don't use a single mutation for bulk invites in this implementation, 
  // but we keep this for single invite logic if needed or reference.
  // Actually we will use api.post directly in handleInvite for bulk.

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/agendas/${agenda.id}/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      addToast(t('roleUpdatedSuccess', 'Rol actualizado correctamente'), 'success');
    },
    onError: (error) => {
      console.error("Failed to update role", error);
      addToast(t('error_updating_role', 'Error al actualizar rol'), 'error');
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/agendas/${agenda.id}/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      setShowRemoveUserConfirm(false);
      setUserToRemove(null);
      addToast(t('userRemovedSuccess', 'Usuario eliminado correctamente'), 'success');
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      addToast(t('error_removing_user', 'Error al eliminar usuario'), 'error');
    }
  });

  const handleSaveGeneral = () => {
    const updates = {};
    if (agendaName.trim() !== agenda.name) {
      updates.name = agendaName;
    }
    if (agendaDescription.trim() !== (agenda.description || '')) {
      updates.description = agendaDescription;
    }

    if (Object.keys(updates).length > 0) {
      updateAgendaMutation.mutate(updates);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (inviteEmails.length > 0) {
      const promises = inviteEmails.map(email =>
        api.post(`/agendas/${agenda.id}/invite`, { email, role: inviteRole })
      );

      try {
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['agendas'] });
        setInviteEmails([]);
        addToast(t('invitationsSent', 'Invitaciones enviadas correctamente'), 'success');
      } catch (error) {
        console.error("Failed to invite users", error);

        // Check for specific error responses from the first failed promise
        // Note: Promise.all fails fast, so we get the first error.
        // Ideally we would use Promise.allSettled to handle partial successes, 
        // but for now let's just show the error of the one that failed.
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message;

        if (status === 404) {
          addToast(t('user_not_found', 'Usuario no encontrado'), 'error');
        } else if (status === 409) {
          if (errorMessage?.includes('already a member')) {
            addToast(t('user_already_exists', 'El usuario ya es miembro'), 'warning');
          } else {
            addToast(t('invitation_already_sent', 'Invitación ya enviada'), 'warning');
          }
        } else {
          addToast(t('error_inviting_users', 'Error al enviar algunas invitaciones'), 'error');
        }
      }
    }
  };

  const handleRemoveUserClick = (userId) => {
    setUserToRemove(userId);
    setShowRemoveUserConfirm(true);
  };

  const confirmRemoveUser = () => {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove);
    }
  };

  const confirmDeleteAgenda = () => {
    deleteAgendaMutation.mutate();
  };

  const confirmLeaveAgenda = () => {
    leaveAgendaMutation.mutate();
  };

  // Helper to check permissions
  const canManageAgenda = () => {
    return getMyRole() === 'OWNER';
  };

  const getMyRole = () => {
    if (agenda.userRole) return agenda.userRole;
    if (agenda.ownerId === currentUser.id) return 'OWNER';
    return agenda.agendaUsers?.find(u => u.userId === currentUser.id)?.role;
  };

  const canInviteUsers = () => {
    const myRole = getMyRole();
    const type = agenda.type;

    if (type === 'PERSONAL' || agenda.googleCalendarId) return false; // No invites for personal/google

    if (type === 'COLABORATIVA') {
      return myRole === 'OWNER' || myRole === 'EDITOR';
    }
    if (type === 'EDUCATIVA') {
      return myRole === 'OWNER' || myRole === 'PROFESSOR';
    }
    if (type === 'LABORAL') {
      return myRole === 'OWNER' || myRole === 'CHIEF';
    }
    return false;
  };

  const getAvailableRolesToInvite = () => {
    const type = agenda.type;
    if (type === 'COLABORATIVA') return ['EDITOR', 'VIEWER'];
    if (type === 'EDUCATIVA') return ['PROFESSOR', 'STUDENT'];
    if (type === 'LABORAL') return ['CHIEF', 'EMPLOYEE'];
    return ['VIEWER'];
  };

  const canChangeRole = (targetRole) => {
    // Only owner can change roles for now to keep it simple and safe
    return canManageAgenda();
  };

  const canRemoveUser = (targetRole) => {
    return canManageAgenda();
  };

  const availableRoles = getAvailableRolesToInvite();

  // Auto-select valid role if current one is invalid for this agenda type
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(inviteRole)) {
      setInviteRole(availableRoles.includes('STUDENT') ? 'STUDENT' : availableRoles[0]);
    }
  }, [agenda, inviteRole]);

  // Construct full member list including owner
  const ownerMember = agenda.owner ? { user: agenda.owner, role: 'OWNER' } : null;
  const otherMembers = agenda.agendaUsers?.filter(u => u.userId !== agenda.ownerId) || [];
  const allMembers = ownerMember ? [ownerMember, ...otherMembers] : otherMembers;

  const [activeDropdownUserId, setActiveDropdownUserId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeDropdownUserId) setActiveDropdownUserId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdownUserId]);

  const renderUserItem = (member) => {
    const { user, role } = member;
    const isCurrentUser = user.id === currentUser.id;
    // Prevent editing the owner's role or removing the owner
    const isOwner = role === 'OWNER';
    const canEditThisUser = !isCurrentUser && !isOwner && canChangeRole(role);
    const canRemoveThisUser = !isCurrentUser && !isOwner && canRemoveUser(role);

    return (
      <div key={user.id} className="user-list-item">
        <div
          className="user-info-container clickable"
          onClick={() => setSelectedUserProfile(user)}
          style={{ cursor: 'pointer' }}
        >
          <div className="user-avatar-wrapper">
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`}
                alt={user.name}
                className="user-avatar-circle"
                referrerPolicy="no-referrer"
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
              <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() => setActiveDropdownUserId(activeDropdownUserId === user.id ? null : user.id)}
                >
                  {t(`roles.${role}`, role)}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {activeDropdownUserId === user.id && (
                  <ul className="dropdown-menu">
                    {availableRoles.map(r => (
                      <li
                        key={r}
                        className={`dropdown-item ${role === r ? 'active' : ''}`}
                        onClick={() => {
                          updateUserRoleMutation.mutate({ userId: user.id, role: r });
                          setActiveDropdownUserId(null);
                        }}
                      >
                        {t(`roles.${r}`, r)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canRemoveThisUser && (
                <button
                  className="btn-remove-user"
                  onClick={(e) => { e.stopPropagation(); handleRemoveUserClick(user.id); }}
                  title={t('removeUser')}
                >
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

  if (!agenda) return null;

  const showMembersTab = agenda.type !== 'PERSONAL' && !agenda.googleCalendarId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('agendaSettingsTitle', { name: agenda.name })}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            {t('generalTab', 'General')}
          </button>
          {showMembersTab && (
            <button
              className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              {t('membersTab', 'Miembros')}
            </button>
          )}
        </div>

        <div className="modal-body">
          {activeTab === 'general' && (
            <div className="general-settings">
              <div className="form-group">
                <label>{t('agendaNameLabel_settings', 'Nombre de la Agenda')}</label>
                <input
                  type="text"
                  value={agendaName}
                  onChange={(e) => setAgendaName(e.target.value)}
                  className="form-input"
                  disabled={!canManageAgenda()}
                />
              </div>
              <div className="form-group">
                <label>{t('agendaDescriptionLabel_settings', 'Descripción')}</label>
                <textarea
                  value={agendaDescription}
                  onChange={(e) => setAgendaDescription(e.target.value)}
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  disabled={!canManageAgenda()}
                />
              </div>

              {canManageAgenda() && (
                <button
                  className="btn btn-primary"
                  onClick={handleSaveGeneral}
                  disabled={updateAgendaMutation.isPending || (agendaName.trim() === agenda.name && agendaDescription.trim() === (agenda.description || ''))}
                >
                  {updateAgendaMutation.isPending ? t('savingButton', 'Guardando...') : t('saveChangesButton_agenda', 'Guardar Cambios')}
                </button>
              )}

              <div className="danger-zone">
                {agenda.googleCalendarId && (
                  <div className="sync-status-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>{t('googleSyncStatus', 'Estado de Sincronización Google')}</h4>
                    <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                      <p><strong>ID Calendario:</strong> {agenda.googleCalendarId}</p>
                      <p><strong>Webhook Activo:</strong> {agenda.googleChannelId ? 'Sí' : 'No'}</p>
                      {agenda.googleChannelExpiration && (
                        <p><strong>Expira:</strong> {new Date(agenda.googleChannelExpiration).toLocaleString()}</p>
                      )}
                      {!agenda.googleChannelId && (
                        <p style={{ color: '#ef4444', marginTop: '5px' }}>
                          ⚠️ {t('webhookNotActive', 'El webhook no está activo. Los cambios en Google no se reflejarán automáticamente.')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <h4>{t('dangerZoneTitle', 'Zona de Peligro')}</h4>

                {canManageAgenda() ? (
                  <div className="danger-item">
                    <div>
                      <strong>{t('deleteAgendaTitle', 'Eliminar esta agenda')}</strong>
                      <p>{t('deleteAgendaDescription', 'Una vez eliminada, no hay vuelta atrás.')}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      {t('deleteButton', 'Eliminar')}
                    </button>
                  </div>
                ) : (
                  <div className="danger-item">
                    <div>
                      <strong>{t('leaveAgendaTitle', 'Salir de esta agenda')}</strong>
                      <p>{t('leaveAgendaDescription', 'Dejarás de tener acceso a esta agenda.')}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowLeaveConfirm(true)}
                    >
                      {t('leaveButton', 'Salir')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && showMembersTab && (
            <div className="members-settings">
              {canInviteUsers() && (
                <div className="invite-form">
                  <h3>{t('inviteUserTitle', 'Invitar Usuario')}</h3>
                  <form onSubmit={handleInvite}>
                    <div className="invite-row-container">
                      <div className="invite-input-wrapper" style={{ flex: 1 }}>
                        <MultiEmailInput
                          emails={inviteEmails}
                          onChange={setInviteEmails}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="invite-actions-wrapper">
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="role-select-compact"
                        >
                          {availableRoles.map(r => <option key={r} value={r}>{t(`roles.${r}`, r)}</option>)}
                        </select>
                        <button
                          type="submit"
                          className="btn btn-primary btn-compact"
                          disabled={inviteEmails.length === 0}
                        >
                          {t('inviteButton', 'Invitar')}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="members-list-container">
                <h3>{t('membersCount', { count: allMembers.length })}</h3>
                <div className="user-list">
                  {allMembers.map(renderUserItem)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUserProfile && (
        <UserProfileModal
          isOpen={!!selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
          user={selectedUserProfile}
        />
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay confirm-modal" style={{ zIndex: 1100 }}>
          <div className="modal-content confirm-content">
            <h3>{t('confirmDeletionTitle', 'Confirmar Eliminación')}</h3>
            <p>{t('confirmDeleteAgenda', { name: agenda.name })}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                {t('cancelButton', 'Cancelar')}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDeleteAgenda}
                disabled={deleteAgendaMutation.isPending}
              >
                {deleteAgendaMutation.isPending ? t('deletingAgendaButton', 'Eliminando...') : t('deleteButton', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="modal-overlay confirm-modal" style={{ zIndex: 1100 }}>
          <div className="modal-content confirm-content">
            <h3>{t('confirmLeaveTitle', 'Confirmar Salida')}</h3>
            <p>{t('confirmLeaveAgenda', { name: agenda.name })}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLeaveConfirm(false)}>
                {t('cancelButton', 'Cancelar')}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmLeaveAgenda}
                disabled={leaveAgendaMutation.isPending}
              >
                {leaveAgendaMutation.isPending ? t('leavingAgendaButton', 'Saliendo...') : t('leaveButton', 'Salir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemoveUserConfirm && (
        <div className="modal-overlay confirm-modal" style={{ zIndex: 1100 }}>
          <div className="modal-content confirm-content">
            <h3>{t('confirmRemoveUser', '¿Eliminar usuario?')}</h3>
            <p>{t('confirmRemoveUserMessage', '¿Estás seguro de que quieres eliminar a este usuario de la agenda?')}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRemoveUserConfirm(false)}>
                {t('cancelButton', 'Cancelar')}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmRemoveUser}
                disabled={removeUserMutation.isPending}
              >
                {removeUserMutation.isPending ? t('removing', 'Eliminando...') : t('remove', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgendaSettingsModal;
// Force update
