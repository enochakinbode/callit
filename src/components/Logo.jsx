export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#E8B84B"/>
      <path d="M60 30 A 22 22 0 1 0 60 70" stroke="#000000" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="44" cy="35" r="3.5" fill="#000000"/>
      <line x1="44" y1="41" x2="44" y2="52" stroke="#000000" strokeWidth="6" strokeLinecap="round"/>
      <line x1="56" y1="17" x2="56" y2="52" stroke="#000000" strokeWidth="6" strokeLinecap="round"/>
      <line x1="49" y1="44" x2="64" y2="44" stroke="#000000" strokeWidth="5.5" strokeLinecap="round"/>
    </svg>
  )
}
