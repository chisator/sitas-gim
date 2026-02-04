import React from "react";

export function Logo({ size = 250 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Glow rosa */}
                <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur1" />
                    <feGaussianBlur stdDeviation="10" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Glow celeste */}
                <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur1" />
                    <feGaussianBlur stdDeviation="10" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Animaciones */}
                <style>{`
          .startup {
            animation: startup 2s ease-out forwards, flicker 3.5s infinite 2s;
          }

          .startup-slow {
            animation: startup 3.5s ease-out forwards, flicker 4s infinite 2.5s;
          }

          @keyframes startup {
            0%   { opacity: 0; }
            5%   { opacity: 1; }
            10%  { opacity: 0.2; }
            15%  { opacity: 1; }
            20%  { opacity: 0.3; }
            25%  { opacity: 1; }
            100% { opacity: 1; }
          }

          @keyframes flicker {
            0% { opacity: 1; }
            3% { opacity: 0.4; }
            6% { opacity: 1; }
            7% { opacity: 0.2; }
            10% { opacity: 1; }
            100% { opacity: 1; }
          }
        `}</style>
            </defs>

            {/* Fondo */}
            <circle cx="200" cy="200" r="150" fill="#050505" />

            {/* SITAS */}
            <text
                x="40"
                y="155"
                fontSize="30"
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                fill="#ff4fa3"
                filter="url(#glowPink)"
                transform="rotate(-18 100 125)"
                className="startup"
            >
                SITAS
            </text>

            {/* FITNESS */}
            <text
                x="85"
                y="215"
                fontSize="54"
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                fill="#5ff2e8"
                filter="url(#glowCyan)"
                className="startup-slow"
            >
                FITNESS
            </text>

            {/* CENTER */}
            <text
                x="95"
                y="275"
                fontSize="54"
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                fill="#5ff2e8"
                filter="url(#glowCyan)"
                className="startup-slow"
            >
                CENTER
            </text>
        </svg>
    );
}
