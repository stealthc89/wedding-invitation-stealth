export default function MonogramLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Decorative circle border */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
        />
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* First C (Chris) - slightly to the left */}
        <path
          d="M 95 50
             A 35 35 0 0 1 95 150
             A 35 35 0 0 0 95 50
             M 95 60
             A 25 25 0 0 0 95 140"
          fill="currentColor"
          opacity="0.9"
          transform="translate(-10, 0)"
        />

        {/* Second C (Candice) - slightly to the right, overlapping */}
        <path
          d="M 95 50
             A 35 35 0 0 1 95 150
             A 35 35 0 0 0 95 50
             M 95 60
             A 25 25 0 0 0 95 140"
          fill="currentColor"
          opacity="0.9"
          transform="translate(15, 0)"
        />

        {/* Ampersand or decorative element in center */}
        <text
          x="100"
          y="115"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="30"
          fill="currentColor"
          opacity="0.6"
          fontStyle="italic"
        >
          &amp;
        </text>

        {/* Small decorative flourishes */}
        <path
          d="M 100 30 Q 95 35, 100 40"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 100 170 Q 95 165, 100 160"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
