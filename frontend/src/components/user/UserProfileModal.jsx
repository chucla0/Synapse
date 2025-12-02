import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import './UserProfileModal.css';

const UserProfileModal = ({ isOpen, onClose, userId, user: initialUser }) => {
    const { t } = useTranslation();
    const [user, setUser] = useState(initialUser || null);
    const [loading, setLoading] = useState(!initialUser && !!userId);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && userId && !initialUser) {
            setLoading(true);
            setError(null);
            api.get(`/auth/users/${userId}`) // Assuming this endpoint exists or we need to create it/use a similar one
                .then(response => {
                    setUser(response.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch user details", err);
                    setError(t('common.error'));
                    setLoading(false);
                });
        } else if (isOpen && initialUser) {
            setUser(initialUser);
        }
    }, [isOpen, userId, initialUser, t]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>

                {loading ? (
                    <div className="modal-loading">
                        <div className="spinner"></div>
                    </div>
                ) : error ? (
                    <div className="modal-error">{error}</div>
                ) : user ? (
                    <div className="user-profile-content">
                        <div className="user-profile-header">
                            <div className="avatar-container">
                                <img
                                    src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                                    alt={user.name}
                                    className="user-profile-avatar"
                                />
                                <div className={`status-indicator status-${user.status?.toLowerCase() || 'offline'}`} title={t(`status.${user.status?.toLowerCase() || 'offline'}`)}></div>
                            </div>
                            <h2>{user.name}</h2>
                            <p className="user-profile-email">{user.email}</p>
                        </div>

                        <div className="user-profile-body">
                            <h3>{t('userProfile.bio')}</h3>
                            <p className="user-profile-bio">
                                {user.bio || t('userProfile.noBio')}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default UserProfileModal;
