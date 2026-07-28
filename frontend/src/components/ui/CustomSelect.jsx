import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

const INDICATOR_COLORS = {
  green: { bg: 'var(--success-text)' },
  red: { bg: 'var(--danger-text)' },
};

const CustomSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  indicatorColor,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find(o => o.value === value);
  const indicator = indicatorColor ? INDICATOR_COLORS[indicatorColor] : null;

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIdx(-1);
  }, []);

  const openDropdown = () => {
    setOpen(true);
    const idx = value ? options.findIndex(o => o.value === value) : 0;
    setFocusedIdx(idx >= 0 ? idx : 0);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  useEffect(() => {
    if (open && listRef.current && focusedIdx >= 0) {
      const item = listRef.current.children[focusedIdx];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [open, focusedIdx]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < options.length) {
          onChange(options[focusedIdx].value);
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative" style={{ position: 'relative' }}>
      {label && (
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <button
        type="button"
          onClick={() => { if (!disabled) { open ? close() : openDropdown(); } }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 min-h-11 cursor-pointer appearance-none"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          outline: 'none',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#f59e0b';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.2)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--input-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {indicator && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: indicator.bg }}
          />
        )}
        <span className="flex-1 truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 z-[100] mt-1 rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            boxShadow: '0 8px 32px var(--shadow-color)',
            maxHeight: '192px',
            overflowY: 'auto',
          }}
          onKeyDown={handleKeyDown}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              No options
            </div>
          ) : (
            options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isFocused = i === focusedIdx;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(opt.value); close(); }}
                  onMouseEnter={() => setFocusedIdx(i)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors"
                  style={{
                    background: isSelected
                      ? 'var(--accent-bg)'
                      : isFocused
                        ? 'var(--hover-bg)'
                        : 'transparent',
                    color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)',
                  }}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <span style={{ color: 'var(--accent-text)' }} className="text-xs">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
