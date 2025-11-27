import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import { useTranslation } from 'react-i18next';
import "react-datepicker/dist/react-datepicker.css";
import './CustomDatePicker.css';

// Register Spanish locale
registerLocale('es', es);

const CustomDatePicker = ({ 
  selected, 
  onChange, 
  label, 
  showTimeSelect, 
  showTimeInput,
  dateFormat = "d MMMM, yyyy h:mm aa", 
  disabled, 
  placeholderText,
  ...props 
}) => {
  const { t } = useTranslation();

  return (
    <div className="custom-datepicker-wrapper">
      {label && <label className="datepicker-label">{label}</label>}
      <DatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect={showTimeSelect}
        showTimeInput={showTimeInput}
        dateFormat={dateFormat}
        locale="es"
        disabled={disabled}
        placeholderText={placeholderText}
        className="custom-datepicker-input"
        calendarClassName="custom-datepicker-calendar"
        timeClassName={() => "custom-datepicker-time"}
        wrapperClassName="datepicker-input-container"
        timeInputLabel={t('timeLabel')}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') {
            e.preventDefault();
          }
        }}
        {...props}
      />
    </div>
  );
};

export default CustomDatePicker;
