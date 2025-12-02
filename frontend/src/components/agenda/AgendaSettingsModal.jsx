import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import UserProfileModal from '../user/UserProfileModal';
import MultiEmailInput from '../ui/MultiEmailInput';
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

  // Update local state if agenda prop changes
  useEffect(() => {
    if (agenda) {
      setAgendaName(agenda.name);
      setAgendaDescription(agenda.description || '');
    }
  }, [agenda]);

  const updateAgendaMutation = useMutation({
    mutationFn: (data) => api.put(`/agendas/${agenda.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      // Optional: show success toast
    },
    onError: (error) => {
      console.error("Failed to update agenda", error);
      alert(t('error_updating_agenda', 'Error al actualizar la agenda'));
    }
  });

  const deleteAgendaMutation = useMutation({
    mutationFn: () => api.delete(`/agendas/${agenda.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to delete agenda", error);
      alert(t('error_deleting_agenda', 'Error al eliminar la agenda'));
    }
  });

  // We don't use a single mutation for bulk invites in this implementation, 
  // but we keep this for single invite logic if needed or reference.
  // Actually we will use api.post directly in handleInvite for bulk.

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/agendas/${agenda.id}/users/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
    },
    onError: (error) => {
      console.error("Failed to update role", error);
      alert(t('error_updating_role', 'Error al actualizar rol'));
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/agendas/${agenda.id}/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      setShowRemoveUserConfirm(false);
      setUserToRemove(null);
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      alert(t('error_removing_user', 'Error al eliminar usuario'));
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
        alert(t('invitationsSent', 'Invitaciones enviadas correctamente'));
      } catch (error) {
        console.error("Failed to invite users", error);
        alert(t('error_inviting_users', 'Error al enviar algunas invitaciones'));
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

  // Helper to check permissions
  const canManageAgenda = () => {
    const myRole = agenda.agendaUsers.find(u => u.userId === currentUser.id)?.role;
    return myRole === 'OWNER';
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

  // Construct full member list including owner
  const ownerMember = agenda.owner ? { user: agenda.owner, role: 'OWNER' } : null;
  const otherMembers = agenda.agendaUsers?.filter(u => u.userId !== agenda.ownerId) || [];
  const allMembers = ownerMember ? [ownerMember, ...otherMembers] : otherMembers;

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
              <select
                className="role-select"
                value={role}
                onChange={(e) => updateUserRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              >
                {availableRoles.map(r => <option key={r} value={r}>{t(`roles.${r}`, r)}</option>)}
              </select>
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
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveGeneral}
                disabled={updateAgendaMutation.isPending || (agendaName.trim() === agenda.name && agendaDescription.trim() === (agenda.description || ''))}
              >
                {updateAgendaMutation.isPending ? t('savingButton', 'Guardando...') : t('saveChangesButton_agenda', 'Guardar Cambios')}
              </button>

              {canManageAgenda() && (
                <div className="danger-zone">
                  <h4>{t('dangerZoneTitle', 'Zona de Peligro')}</h4>
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
                </div>
              )}
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
