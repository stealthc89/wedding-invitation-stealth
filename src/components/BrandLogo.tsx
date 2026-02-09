export default function BrandLogo({
  className = "",
  variant = "default"
}: {
  className?: string;
  variant?: "default" | "diagonal" | "backToBack";
}) {
  // Interlocking C's like Chanel - elegant and iconic
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 140"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Interlocking C & C composition - inspired by Chanel */}

        {/* First C - facing right */}
        <g opacity="0.95">
          <path
            d="M 120 30
               C 135 30, 145 35, 150 45
               L 145 48
               C 141 40, 133 35, 120 35
               C 100 35, 85 50, 85 70
               C 85 90, 100 105, 120 105
               C 133 105, 141 100, 145 92
               L 150 95
               C 145 105, 135 110, 120 110
               C 97 110, 80 93, 80 70
               C 80 47, 97 30, 120 30
               Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>

        {/* Second C - facing left, same level */}
        <g opacity="0.95">
          <path
            d="M 80 30
               C 65 30, 55 35, 50 45
               L 55 48
               C 59 40, 67 35, 80 35
               C 100 35, 115 50, 115 70
               C 115 90, 100 105, 80 105
               C 67 105, 59 100, 55 92
               L 50 95
               C 55 105, 65 110, 80 110
               C 103 110, 120 93, 120 70
               C 120 47, 103 30, 80 30
               Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>

        {/* Ampersand tied to the C's */}
        <text
          x="100"
          y="78"
          textAnchor="middle"
          fontFamily="'Didot', 'Bodoni MT', 'Playfair Display', Georgia, serif"
          fontSize="24"
          fill="currentColor"
          fontWeight="400"
          fontStyle="italic"
          opacity="0.85"
        >
          &amp;
        </text>
      </svg>
    </div>
  );
}
