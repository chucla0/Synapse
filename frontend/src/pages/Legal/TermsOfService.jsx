import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Legal.css';

const TermsOfService = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="legal-container">
      <header className="legal-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          <span>{t('back', 'Volver')}</span>
        </button>
        <h1>{t('termsOfService', 'Términos de Servicio')}</h1>
      </header>
      
      <main className="legal-content">
        <section>
          <h2>1. Aceptación de los Términos</h2>
          <p>Al acceder y utilizar Synapse Agenda, usted acepta estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar el servicio.</p>
        </section>

        <section>
          <h2>2. Descripción del Servicio</h2>
          <p>Synapse es una plataforma de gestión de calendarios y agendas colaborativas. El servicio se proporciona "tal cual" y "según disponibilidad". Nos reservamos el derecho de modificar o interrumpir el servicio en cualquier momento.</p>
        </section>

        <section>
          <h2>3. Cuentas de Usuario</h2>
          <p>Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Debe notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta.</p>
        </section>

        <section>
          <h2>4. Limitación de Responsabilidad</h2>
          <p>Synapse Agenda no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo que resulte de su acceso o uso del servicio.</p>
        </section>

        <section>
          <h2>5. Contacto</h2>
          <p>Si tiene alguna pregunta sobre estos Términos, contáctenos en: iizan.cruzz@gmail.com</p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfService;
