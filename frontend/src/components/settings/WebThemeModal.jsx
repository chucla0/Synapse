import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { X, Check } from 'lucide-react';
import './WebSettingsModal.css';

function WebThemeModal({ onClose }) {
  const { t } = useTranslation();
  const { theme, setTheme, accentId, setAccentId, availableThemes, availableColors } = useTheme();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h1>{t('webThemeTitle', 'Web Theme')}</h1>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="settings-section">
          <h3>{t('themeLabel')}</h3>
          <div className="theme-options">
            {availableThemes.map((tOption) => (
              <button
                key={tOption}
                className={`theme-option ${theme === tOption ? 'active' : ''}`}
                onClick={() => setTheme(tOption)}
              >
                {t(`theme_${tOption}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>{t('accentColorLabel')}</h3>
          <div className="color-options">
            {availableColors.map((color) => {
              const displayColor = theme === 'dark' ? color.dark : color.light;
              return (
                <button
                  key={color.id}
                  className={`color-swatch ${accentId === color.id ? 'active' : ''}`}
                  style={{ backgroundColor: displayColor }}
                  onClick={() => setAccentId(color.id)}
                  aria-label={color.label}
                  title={color.label}
                >
                  {accentId === color.id && <span className="check-icon"><Check size={16} /></span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t('closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebThemeModal;
