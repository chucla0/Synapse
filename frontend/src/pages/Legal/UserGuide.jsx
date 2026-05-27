import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Users, Bell, Settings } from 'lucide-react';
import './Legal.css';

const UserGuide = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="legal-container">
      <header className="legal-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          <span>{t('back', 'Volver')}</span>
        </button>
        <h1>{t('userGuideTitle', 'Guía de Usuario')}</h1>
      </header>
      
      <main className="legal-content">
        <section>
          <h2><Calendar size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Gestión de Agendas</h2>
          <p>Synapse te permite crear diferentes tipos de agendas según tus necesidades:</p>
          <ul>
            <li><strong>Personal:</strong> Para tus eventos privados.</li>
            <li><strong>Laboral:</strong> Con flujo de aprobación para equipos.</li>
            <li><strong>Educativa:</strong> Separación entre profesores y estudiantes.</li>
          </ul>
        </section>

        <section>
          <h2><Users size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Colaboración</h2>
          <p>Invita a otros usuarios a tus agendas compartidas. Puedes asignarles roles como Editor, Lector o Jefe (en agendas laborales).</p>
        </section>

        <section>
          <h2><Bell size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Notificaciones</h2>
          <p>Recibirás avisos en tiempo real cuando alguien te invite a una agenda, cree un evento o cuando un jefe apruebe tu solicitud.</p>
        </section>

        <section>
          <h2><Settings size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Personalización</h2>
          <p>Desde los ajustes web puedes cambiar el tema (claro/oscuro), el color de acento de la interfaz y tu idioma de preferencia.</p>
        </section>
      </main>
    </div>
  );
};

export default UserGuide;
