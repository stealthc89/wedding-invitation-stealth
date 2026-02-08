export default function MonogramLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Elegant outer circle */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* Inner circle */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* Sophisticated C letterforms */}
        {/* First C (Chris) - elegant serif style */}
        <path
          d="M 75 60
             Q 65 60, 60 70
             Q 55 80, 55 100
             Q 55 120, 60 130
             Q 65 140, 75 140
             L 75 135
             Q 67 135, 63 126
             Q 60 117, 60 100
             Q 60 83, 63 74
             Q 67 65, 75 65
             Z"
          fill="currentColor"
          opacity="0.9"
        />

        {/* Second C (Candice) - mirror and overlap elegantly */}
        <path
          d="M 125 60
             Q 135 60, 140 70
             Q 145 80, 145 100
             Q 145 120, 140 130
             Q 135 140, 125 140
             L 125 135
             Q 133 135, 137 126
             Q 140 117, 140 100
             Q 140 83, 137 74
             Q 133 65, 125 65
             Z"
          fill="currentColor"
          opacity="0.9"
        />

        {/* Refined ampersand */}
        <text
          x="100"
          y="110"
          textAnchor="middle"
          fontFamily="'Times New Roman', Georgia, serif"
          fontSize="24"
          fill="currentColor"
          opacity="0.7"
          fontStyle="italic"
          fontWeight="300"
        >
          &amp;
        </text>

        {/* Elegant decorative flourishes */}
        <path
          d="M 85 45 Q 90 40, 95 40 Q 100 40, 105 40 Q 110 40, 115 45"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M 85 155 Q 90 160, 95 160 Q 100 160, 105 160 Q 110 160, 115 155"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.35"
        />

        {/* Small decorative dots */}
        <circle cx="75" cy="50" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="125" cy="50" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="75" cy="150" r="1" fill="currentColor" opacity="0.4" />
        <circle cx="125" cy="150" r="1" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  );
}
