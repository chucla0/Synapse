import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import { X, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { getUser, setUser, clearAuth } from '../../utils/auth';
import './ProfileSettingsModal.css';

// Helper to create the cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.95);
  });
}

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

  // Cropper state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setIsCropping(true);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleCropSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });

      // Upload immediately
      const uploadResponse = await uploadAvatarMutation.mutateAsync(file);
      const newAvatarUrl = uploadResponse.data.filePath;

      setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
      setIsCropping(false);
      setImageSrc(null);
    } catch (e) {
      console.error(e);
      setErrors({ submit: 'Error al procesar la imagen' });
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
  };

  const handleDeleteAvatar = () => {
    if (window.confirm(t('confirmDeleteAvatar'))) {
      setFormData(prev => ({ ...prev, avatar: null }));
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

  const syncGoogleMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/import'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      // Show success message (maybe reuse errors state for success or add new state)
      // For now, let's just alert or log
      alert(t('googleCalendarSuccess'));
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error al sincronizar';
      setErrors({ submit: message });
    }
  });

  const handleSyncGoogle = () => {
    setErrors({});
    syncGoogleMutation.mutate();
  };

  // Delete Account Logic
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const deleteAccountMutation = useMutation({
    mutationFn: (data) => api.delete('/auth/profile', { data }),
    onSuccess: () => {
      clearAuth();
      window.location.href = '/login';
    },
    onError: (error) => {
      setErrors(prev => ({ ...prev, delete: error.response?.data?.message || 'Error al eliminar la cuenta' }));
    }
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate({ password: deletePassword });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const payload = {};
    if (formData.name !== currentUser.name) {
      payload.name = formData.name;
    }
    // Check if avatar changed (including deletion which sets it to null)
    if (formData.avatar !== currentUser.avatar) {
      payload.avatar = formData.avatar; // Can be null for deletion
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
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        {isCropping ? (
          <div className="cropper-container">
            <div className="cropper-wrapper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>
            <div className="cropper-controls">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="zoom-range"
              />
              <div className="cropper-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancelCrop}>
                  {t('cancelButton')}
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCropSave}>
                  {t('saveImageButton')}
                </button>
              </div>
            </div>
          </div>
        ) : (
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                disabled={updateProfileMutation.isPending}
              />
            </div>

            {/* Avatar Upload */}
            <div className="form-group">
              <label>{t('avatarUrlLabel')}</label>
              <div className="avatar-upload-area">
                {formData.avatar ? (
                  <img
                    src={formData.avatar.startsWith('http') ? formData.avatar : `${API_URL}${formData.avatar}`}
                    alt="Avatar Preview"
                    className="avatar-preview"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="avatar-preview avatar-preview-default">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-actions">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm">
                    {t('changeImageButton')}
                  </label>
                  {formData.avatar && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteAvatar}
                      title={t('deleteImageButton')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
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
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="input"
                placeholder={t('passwordPlaceholder')}
                disabled={updateProfileMutation.isPending}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">{t('newPasswordLabel')}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="input"
                placeholder={t('passwordPlaceholder')}
                disabled={updateProfileMutation.isPending}
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
                disabled={updateProfileMutation.isPending}
              >
                {t('cancelButton')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? t('savingButton') : t('saveChangesButton')}
              </button>
            </div>
          </form>
        )}

        {!isCropping && (
          <div className="danger-zone">
            <h3 className="danger-zone-title">{t('dangerZoneTitle', 'Zona de Peligro')}</h3>
            <div className="danger-zone-content">
              <p className="text-muted text-sm mb-4">
                {t('deleteAccountWarning', 'Eliminar tu cuenta es irreversible. Se eliminarán todas tus agendas personales. Las agendas compartidas se transferirán a otros miembros si es posible.')}
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  className="btn btn-danger btn-block"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t('deleteAccountButton', 'Eliminar Cuenta')}
                </button>
              ) : (
                <div className="delete-confirm-box">
                  <p className="text-sm font-bold mb-2">{t('confirmDeleteTitle', '¿Estás seguro?')}</p>
                  {currentUser?.password && (
                    <input
                      type="password"
                      placeholder={t('passwordPlaceholder', 'Contraseña')}
                      className="input mb-2"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  )}
                  {errors.delete && <p className="text-danger text-xs mb-2">{errors.delete}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary flex-1"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setErrors(prev => ({ ...prev, delete: null }));
                      }}
                    >
                      {t('cancelButton')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger flex-1"
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? t('deleting', 'Eliminando...') : t('confirmDeleteButton', 'Sí, eliminar')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileSettingsModal;
