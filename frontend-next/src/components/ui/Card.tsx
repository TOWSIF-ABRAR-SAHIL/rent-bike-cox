"use client";

import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
}

const Card = ({ children, hover, glow, className = '', ...props }: CardProps) => (
  <div
    className={`glass rounded-2xl ${hover ? 'card-hover cursor-pointer' : ''} ${glow ? 'animate-glow-pulse' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
