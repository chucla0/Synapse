import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useTranslation } from 'react-i18next';
import './GoogleImportModal.css';

export default function GoogleImportModal() {
    const { socket } = useSocket();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processed, setProcessed] = useState(0);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, importing, completed, error
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const onStart = (data) => {
            setIsOpen(true);
            setStatus('importing');
            setProgress(0);
            setProcessed(0);
            setTotal(data.total || 0);
            setError(null);
        };

        const onProgress = (data) => {
            setProgress(data.percentage);
            setProcessed(data.processed);
            setTotal(data.total);
        };

        const onComplete = () => {
            setStatus('completed');
            setProgress(100);
        };

        const onError = (data) => {
            setStatus('error');
            setError(data.message);
        };

        socket.on('google:import:start', onStart);
        socket.on('google:import:progress', onProgress);
        socket.on('google:import:complete', onComplete);
        socket.on('google:import:error', onError);

        return () => {
            socket.off('google:import:start', onStart);
            socket.off('google:import:progress', onProgress);
            socket.off('google:import:complete', onComplete);
            socket.off('google:import:error', onError);
        };
    }, [socket]);

    const handleClose = () => {
        if (status === 'importing') return; // Prevent closing while importing
        setIsOpen(false);
        setStatus('idle');
        setProgress(0);
        setProcessed(0);
        setTotal(0);
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content google-import-modal">
                <div className="modal-header">
                    <h3>{t('googleImportTitle', 'Sincronizando Google Calendar')}</h3>
                    {status !== 'importing' && (
                        <button className="modal-close" onClick={handleClose}>
                            &times;
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {status === 'importing' && (
                        <>
                            <p className="import-status-text">
                                {t('googleImporting', 'Importando eventos...')} ({processed} / {total})
                            </p>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="progress-percentage">{progress}%</p>
                        </>
                    )}

                    {status === 'completed' && (
                        <div className="import-success">
                            <div className="success-icon">✓</div>
                            <p>{t('googleImportSuccess', '¡Calendario importado correctamente!')}</p>
                            <button className="btn btn-primary" onClick={handleClose}>
                                {t('close', 'Cerrar')}
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="import-error">
                            <div className="error-icon">!</div>
                            <p>{t('googleImportError', 'Error al importar el calendario')}</p>
                            <p className="error-details">{error}</p>
                            <button className="btn btn-secondary" onClick={handleClose}>
                                {t('close', 'Cerrar')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
