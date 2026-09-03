import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Search & select...", 
  labelKey = "name", 
  valueKey = "id",
  required = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const text = String(opt[labelKey] || '').toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    return !query || text.includes(query);
  });

  const handleSelect = (opt) => {
    onChange(opt[valueKey], opt[labelKey]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', '');
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected Box / Input */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '0.5rem 0.75rem',
          background: '#ffffff',
          userSelect: 'none'
        }}
      >
        <span style={{ color: selectedOption ? '#0f172a' : '#94a3b8', fontWeight: selectedOption ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption[labelKey] : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {selectedOption && (
            <i 
              className="fas fa-times" 
              onClick={handleClear}
              style={{ color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
              title="Clear selection"
            ></i>
          )}
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#64748b', fontSize: '0.75rem' }}></i>
        </div>
      </div>

      {/* Hidden Native Input for HTML5 form validation */}
      {required && (
        <input 
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
          value={value || ''}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Dropdown Menu with Live Keystroke Search */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          zIndex: 999999,
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '0.35rem'
        }}>
          {/* Live Search Input */}
          <div style={{ padding: '0.25rem 0.35rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.35rem' }}>
            <input 
              type="text"
              className="input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Type to filter list..."
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
            />
          </div>

          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div 
                key={opt[valueKey]}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: String(opt[valueKey]) === String(value) ? 700 : 500,
                  background: String(opt[valueKey]) === String(value) ? '#eff6ff' : 'transparent',
                  color: String(opt[valueKey]) === String(value) ? '#2563eb' : '#334155',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (String(opt[valueKey]) !== String(value)) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (String(opt[valueKey]) !== String(value)) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt[labelKey]}
              </div>
            ))
          ) : (
            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
