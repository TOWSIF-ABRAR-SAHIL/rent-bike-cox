const Spinner = ({ size = 40, className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 animate-spin" />
    </div>
  </div>
);

export default Spinner;
