// Pizza dibujada (SVG) para la portada del Autoservicio cuando no hay foto cargada en
// Configuración. Posiciones fijas (no aleatorias) para que el server y el navegador dibujen
// exactamente lo mismo.

const PEPPERONI: [number, number][] = [
  [200, 92],
  [128, 140],
  [272, 138],
  [110, 228],
  [200, 196],
  [292, 230],
  [150, 300],
  [250, 302],
  [200, 270],
];

const OLIVES: [number, number][] = [
  [160, 104],
  [242, 104],
  [96, 182],
  [306, 184],
  [160, 238],
  [244, 248],
  [124, 274],
  [278, 278],
  [200, 330],
];

const BASIL: [number, number, number][] = [
  [178, 150, -30],
  [236, 180, 40],
  [150, 192, 70],
  [210, 236, -60],
  [262, 266, 20],
  [176, 300, -10],
];

const CHEESE_SPOTS: [number, number, number][] = [
  [170, 120, 14],
  [236, 160, 12],
  [140, 262, 13],
  [262, 210, 11],
  [214, 312, 12],
  [100, 150, 9],
];

export function PizzaIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={className}>
      {/* Masa y borde */}
      <circle cx="200" cy="200" r="194" fill="#b86b26" />
      <circle cx="200" cy="200" r="186" fill="#e0a04a" />
      <circle cx="200" cy="200" r="168" fill="#c8962f" opacity="0.5" />
      {/* Salsa */}
      <circle cx="200" cy="200" r="164" fill="#c3341f" />
      {/* Muzzarella */}
      <path
        d="M200 46c38 2 70 18 94 42 22 22 38 52 40 88 4 40-10 78-34 104-26 28-62 46-102 46-42 0-80-18-106-48C68 252 54 216 58 176c4-38 22-70 48-94 26-22 58-38 94-36z"
        fill="#f4cc63"
      />
      {CHEESE_SPOTS.map(([x, y, r], i) => (
        <circle key={`c${i}`} cx={x} cy={y} r={r} fill="#e9b245" opacity="0.8" />
      ))}
      {/* Cortes */}
      <g stroke="#b9822d" strokeWidth="3" opacity="0.45" strokeLinecap="round">
        <line x1="200" y1="36" x2="200" y2="364" />
        <line x1="36" y1="200" x2="364" y2="200" />
        <line x1="84" y1="84" x2="316" y2="316" />
        <line x1="316" y1="84" x2="84" y2="316" />
      </g>
      {/* Pepperoni */}
      {PEPPERONI.map(([x, y], i) => (
        <g key={`p${i}`}>
          <circle cx={x} cy={y} r="23" fill="#a3241b" />
          <circle cx={x} cy={y} r="18" fill="#bf3324" />
          <circle cx={x - 6} cy={y - 5} r="3" fill="#8a1c15" />
          <circle cx={x + 7} cy={y + 4} r="2.5" fill="#8a1c15" />
          <circle cx={x + 2} cy={y - 9} r="2" fill="#8a1c15" />
        </g>
      ))}
      {/* Aceitunas */}
      {OLIVES.map(([x, y], i) => (
        <g key={`o${i}`}>
          <circle cx={x} cy={y} r="7.5" fill="#1f1a17" />
          <circle cx={x} cy={y} r="3" fill="#c3341f" />
        </g>
      ))}
      {/* Albahaca */}
      {BASIL.map(([x, y, rot], i) => (
        <g key={`b${i}`} transform={`rotate(${rot} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="13" ry="6.5" fill="#3f8a3a" />
          <line x1={x - 11} y1={y} x2={x + 11} y2={y} stroke="#2c6a2a" strokeWidth="1.2" />
        </g>
      ))}
    </svg>
  );
}
