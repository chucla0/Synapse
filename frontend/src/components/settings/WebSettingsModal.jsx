import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import './WebSettingsModal.css';

function WebSettingsModal({ onClose }) {
  const { t } = useTranslation();
  const { theme, setTheme, accentColor, setAccentColor, availableThemes, availableColors } = useTheme();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('webSettingsTitle')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
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
            {/* Placeholder for Dark Mode (Disabled) */}
            <button className="theme-option disabled" disabled title={t('comingSoon')}>
              {t('theme_dark')}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t('accentColorLabel')}</h3>
          <div className="color-options">
            {availableColors.map((color) => (
              <button
                key={color.id}
                className={`color-swatch ${accentColor === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setAccentColor(color.value)}
                aria-label={color.label}
                title={color.label}
              >
                {accentColor === color.value && <span className="check-icon">✓</span>}
              </button>
            ))}
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

export default WebSettingsModal;
