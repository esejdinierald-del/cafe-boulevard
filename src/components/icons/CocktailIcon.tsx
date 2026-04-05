export const CocktailIcon = () => (
  <svg
    viewBox="0 0 48 48"
    className="w-[55px] h-[55px] mx-auto mb-4"
    style={{
      fill: 'none',
      stroke: '#e8c76d',
      strokeWidth: 1.5,
      filter: 'drop-shadow(0 0 12px rgba(232, 199, 109, 0.6)) drop-shadow(0 0 25px rgba(255, 180, 50, 0.3))',
    }}
  >
    {/* Glass body */}
    <path d="M12 12h24L28 26v12h4a2 2 0 0 1 2 2v2H14v-2a2 2 0 0 1 2-2h4V26L12 12z" />
    <line x1="12" y1="12" x2="36" y2="12" strokeLinecap="round" />
    {/* Olive / garnish */}
    <circle cx="30" cy="17" r="1.5" fill="#e8c76d" stroke="none" opacity="0.7" />
    <circle cx="22" cy="15" r="1" fill="#e8c76d" stroke="none" opacity="0.5" />
    {/* Decorative swirl */}
    <path d="M32 10c2-3 5-2 4 0" strokeWidth="1" opacity="0.5" />
    {/* Cross stir accent */}
    <line x1="28" y1="6" x2="33" y2="14" strokeWidth="1" opacity="0.4" stroke="#e8c76d" />
  </svg>
);
