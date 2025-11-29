import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import './MultiEmailInput.css';

const MultiEmailInput = ({ emails, onChange, placeholder, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleKeyDown = (e) => {
    if (['Enter', 'Tab', ',', ' '].includes(e.key)) {
      e.preventDefault();
      addEmail();
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const addEmail = () => {
    const email = inputValue.trim();
    if (!email) return;

    if (isValidEmail(email)) {
      if (!emails.includes(email)) {
        onChange([...emails, email]);
      }
      setInputValue('');
      setError(null);
    } else {
      setError('Email inválido');
    }
  };

  const removeEmail = (index) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    onChange(newEmails);
  };

  const handleBlur = () => {
    if (inputValue) {
      addEmail();
    }
  };

  return (
    <div className={`multi-email-input-container ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`} onClick={() => inputRef.current?.focus()}>
      {emails.map((email, index) => (
        <div key={index} className="email-chip">
          <span>{email}</span>
          {!disabled && (
            <button
              type="button"
              className="remove-chip-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(index);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="email-input-field"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={emails.length === 0 ? placeholder : ''}
        disabled={disabled}
      />
    </div>
  );
};

export default MultiEmailInput;
