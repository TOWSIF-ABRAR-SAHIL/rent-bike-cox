// @ts-nocheck — P1 bootstrap: parity copy of the Vite app. P3 types this file.
"use client";
const Card = ({ children, hover, glow, className = '', ...props }) => (
  <div
    className={`glass rounded-2xl ${hover ? 'card-hover cursor-pointer' : ''} ${glow ? 'animate-glow-pulse' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
