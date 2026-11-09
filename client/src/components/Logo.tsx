import React from 'react';

interface LogoProps {
  /** 'full' = icono + texto (cabecera, landing). 'icon' = solo la marca (espacios reducidos). */
  variant?: 'full' | 'icon';
  size?: number;
  className?: string;
}

/**
 * Marca de SocialQuizz: una burbuja de chat con una muesca de pieza de puzle (social + juego)
 * y un destello amarillo. Dibujada en SVG para que se vea nítida a cualquier tamaño.
 */
export default function Logo({ variant = 'full', size = 40, className }: LogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const iconSize = size;

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      role="img"
      aria-label="SocialQuizz"
      className="sq-logo-icon"
    >
      <defs>
        <linearGradient id={`sq-bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9d7bf7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="26" fill={`url(#sq-bg-${uid})`} />
      {/* Burbuja de chat con muesca de puzle (forma positiva + bulto + muesca) */}
      <path
        d="M24 28 C24 20.8 29.8 15 37 15 L63 15 C70.2 15 76 20.8 76 28 L76 46 C76 53.2 70.2 59 63 59 L45 59 L32 70 C30.3 71.4 28 70.2 28 68 L28 59 L37 59 C29.8 59 24 53.2 24 46 Z"
        fill="#ffffff"
      />
      <circle cx="78" cy="38" r="8.5" fill="#ffffff" />
      <circle cx="48" cy="37" r="7" fill={`url(#sq-bg-${uid})`} />
      {/* Destello */}
      <path
        d="M80 68 L84 77 L93 81 L84 85 L80 94 L76 85 L67 81 L76 77 Z"
        fill="#facc15"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <span className={`sq-logo sq-logo-icon-only ${className ?? ''}`}>{icon}</span>;
  }

  return (
    <span className={`sq-logo sq-logo-full ${className ?? ''}`} style={{ fontSize: iconSize * 0.46 }}>
      {icon}
      <span className="sq-logo-text">
        Social<span className="sq-logo-text-accent">Quizz</span>
      </span>
    </span>
  );
}
