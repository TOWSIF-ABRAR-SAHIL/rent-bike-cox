import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'gradient-primary text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'border',
  danger: 'gradient-accent text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5',
  outline: 'border-2 border-primary-500 text-primary-400 hover:bg-primary-500/10',
  success: 'gradient-success text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5',
};

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-lg min-h-9',
  md: 'px-5 py-2.5 text-sm rounded-xl min-h-11',
  lg: 'px-6 py-3 text-sm rounded-xl min-h-11',
  xl: 'px-8 py-4 text-base rounded-2xl',
};

const ghostStyle = {
  color: 'var(--text-secondary)',
  borderColor: 'var(--border-base)',
};

const ghostHoverStyle = {
  backgroundColor: 'var(--hover-bg)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border-strong)',
};

const Button = ({ children, variant = 'primary', size = 'md', loading, disabled, className = '', ...props }) => {
  const isGhost = variant === 'ghost';
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = isGhost ? () => setHovered(true) : undefined;
  const handleMouseLeave = isGhost ? () => setHovered(false) : undefined;

  const inlineStyle = isGhost ? (hovered ? ghostHoverStyle : ghostStyle) : undefined;

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
      style={inlineStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
