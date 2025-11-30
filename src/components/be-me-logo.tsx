import * as React from 'react';
import { cn } from '@/lib/utils';

export const BeMeLogo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 160 120"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('w-16 h-auto', className)}
    {...props}
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--destructive))', stopOpacity: 1 }} />
      </linearGradient>
       <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <g fill="url(#logo-gradient)" filter="url(#glow)">
        {/* Anchor/Wing structure */}
        <path d="M80 30 L80 50 M80 50 C 70 50, 65 55, 60 70 L 20 70 C 20 85, 30 100, 50 105 L 80 105 L 110 105 C 130 100, 140 85, 140 70 L 100 70 C 95 55, 90 50, 80 50 Z" stroke="url(#logo-gradient)" strokeWidth="3" fill="none"/>
        <path d="M80 35 C 85 35, 90 30, 110 35 L 115 50 L 95 55 C 90 50, 85 50, 80 50" />
        <path d="M80 35 C 75 35, 70 30, 50 35 L 45 50 L 65 55 C 70 50, 75 50, 80 50" />
        <circle cx="80" cy="25" r="5" />
        <path d="M80 20 L80 15 M75 25 L70 25 M85 25 L90 25" stroke="url(#logo-gradient)" strokeWidth="2" fill="none" />
        
        {/* Text "BE" */}
        <text x="35" y="95" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="bold">BE</text>
        
        {/* Text "ME" */}
        <text x="95" y="95" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="bold">ME</text>

        {/* Swoosh */}
        <path d="M20 60 A 70 70 0 1 1 140 60" stroke="url(#logo-gradient)" strokeWidth="5" fill="none" />
    </g>
  </svg>
);
