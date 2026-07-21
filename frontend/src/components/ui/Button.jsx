import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'gradient-primary text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'text-gray-300 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20',
  danger: 'gradient-accent text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5',
  outline: 'border-2 border-primary-500 text-primary-400 hover:bg-primary-500/10',
  success: 'gradient-success text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-sm rounded-xl',
  xl: 'px-8 py-4 text-base rounded-2xl',
};

const Button = ({ children, variant = 'primary', size = 'md', loading, disabled, className = '', ...props }) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
    {children}
  </button>
);

export default Button;
