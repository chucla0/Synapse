import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Legal.css';

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="legal-container">
      <header className="legal-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          <span>{t('back', 'Volver')}</span>
        </button>
        <h1>{t('privacyPolicy', 'Política de Privacidad')}</h1>
      </header>
      
      <main className="legal-content">
        <section>
          <h2>0. Proyecto de demostración</h2>
          <p>Synapse es un proyecto personal de portfolio, no un producto comercial. Úselo solo con datos de prueba: se ofrece sin garantías de disponibilidad ni de privacidad y los datos pueden eliminarse en cualquier momento.</p>
        </section>

        <section>
          <h2>1. Información que recopilamos</h2>
          <p>Recopilamos información que usted nos proporciona directamente al crear una cuenta, como su nombre y dirección de correo electrónico.</p>
        </section>

        <section>
          <h2>2. Uso de la Información</h2>
          <p>Utilizamos su información para proporcionar, mantener y mejorar nuestros servicios, así como para comunicarnos con usted.</p>
        </section>

        <section>
          <h2>3. Cookies</h2>
          <p>Utilizamos cookies técnicas necesarias para el funcionamiento del sitio y para mantener su sesión iniciada.</p>
        </section>

        <section>
          <h2>4. Google y Google Calendar</h2>
          <p>Si inicia sesión con Google o conecta su calendario, usamos su nombre, correo y los eventos de su calendario únicamente para mostrarlos en la aplicación. Puede revocar el acceso en la configuración de su cuenta de Google.</p>
        </section>

        <section>
          <h2>5. Protección de Datos</h2>
          <p>Implementamos medidas de seguridad para proteger sus datos personales contra el acceso no autorizado y la divulgación.</p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
