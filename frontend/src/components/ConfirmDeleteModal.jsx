import { useTranslation } from 'react-i18next';
import './ConfirmDeleteModal.css';

function ConfirmDeleteModal({ message, onConfirm, onCancel, isDeleting, confirmText, deletingText }) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-delete-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('confirmDeletionTitle', 'Confirmar Eliminación')}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={isDeleting}>
            {t('cancelButton', 'Cancelar')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting 
              ? (deletingText || t('deletingButton', 'Eliminando...')) 
              : (confirmText || t('deleteButton', 'Eliminar'))
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
