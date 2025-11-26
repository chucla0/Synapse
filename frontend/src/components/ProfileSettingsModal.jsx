import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { getUser, setUser } from '../utils/auth';
import './ProfileSettingsModal.css';

function ProfileSettingsModal({ onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    avatar: currentUser?.avatar || '',
    currentPassword: '',
    newPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || null);

  useEffect(() => {
    // Clean up the preview URL when the component unmounts
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.post('/uploads/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: (data) => {
      setUser(data.data.user);
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error al actualizar el perfil';
      setErrors({ submit: message });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    let finalAvatarUrl = currentUser.avatar;

    // If a new avatar file was selected, upload it first
    if (avatarFile) {
      try {
        const uploadResponse = await uploadAvatarMutation.mutateAsync(avatarFile);
        finalAvatarUrl = uploadResponse.data.filePath;
      } catch (error) {
        setErrors({ submit: 'Error al subir el avatar.' });
        return;
      }
    }

    const payload = {};
    if (formData.name !== currentUser.name) {
      payload.name = formData.name;
    }
    if (finalAvatarUrl !== currentUser.avatar) {
      payload.avatar = finalAvatarUrl;
    }
    if (formData.newPassword) {
      payload.newPassword = formData.newPassword;
      payload.currentPassword = formData.currentPassword;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    
    updateProfileMutation.mutate(payload);
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('profileSettingsTitle')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Email (Read-only) */}
          <div className="form-group">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={currentUser?.email || ''}
              className="input"
              disabled
              readOnly
            />
          </div>

          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">{t('agendaNameLabel')}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input"
              disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
            />
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label>{t('avatarUrlLabel')}</label>
            <div className="avatar-upload-area">
              {avatarPreview ? (
                <img 
                  src={avatarPreview.startsWith('blob:') ? avatarPreview : `${API_URL}${avatarPreview}`}
                  alt="Avatar Preview" 
                  className="avatar-preview" 
                  onError={() => { setAvatarPreview(null); }} // Fallback to no image state
                />
              ) : (
                <div className="avatar-preview avatar-preview-default">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="avatar-upload" className="btn btn-secondary">
                {t('changeImageButton')}
              </label>
            </div>
          </div>
          
          <hr className="divider" />

          {/* Password Change */}
          <h3 className="form-section-title">{t('changePasswordTitle')}</h3>
          <div className="form-group">
            <label htmlFor="currentPassword">{t('currentPasswordLabel')}</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              className="input"
              placeholder={t('passwordPlaceholder')}
              disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">{t('newPasswordLabel')}</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              className="input"
              placeholder={t('passwordPlaceholder')}
              disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}
          {updateProfileMutation.isError && (
             <div className="error-banner">
              {updateProfileMutation.error.response?.data?.message || 'Error al actualizar'}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
            >
              {updateProfileMutation.isPending || uploadAvatarMutation.isPending ? t('savingButton') : t('saveChangesButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSettingsModal;
