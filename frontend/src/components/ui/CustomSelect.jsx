import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

function CustomSelect({ value, onChange, options, placeholder = 'Select...', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef(null);

  // Open upwards when the list would be clipped below (e.g. inside a scrolling modal)
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let bottomLimit = window.innerHeight;
      let topLimit = 0;
      for (let p = containerRef.current.parentElement; p; p = p.parentElement) {
        const overflowY = getComputedStyle(p).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
          const pr = p.getBoundingClientRect();
          bottomLimit = Math.min(bottomLimit, pr.bottom);
          topLimit = Math.max(topLimit, pr.top);
          break;
        }
      }
      const needed = Math.min(250, options.length * 38 + 12);
      const below = bottomLimit - rect.bottom;
      const above = rect.top - topLimit;
      setOpenUp(below < needed && above > below);
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`} 
        onClick={toggleOpen}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="custom-select-arrow" />
      </div>

      {isOpen && !disabled && (
        <div className={`custom-select-options ${openUp ? 'open-up' : ''}`}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
