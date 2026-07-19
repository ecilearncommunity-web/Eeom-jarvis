import React from "react";

export function CyberdeckLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base Line */}
      <line
        x1="50"
        y1="440"
        x2="462"
        y2="440"
        stroke="#064e3b"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="440"
        x2="452"
        y2="440"
        stroke="#059669"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Left Wall & Awning Outer Border */}
      <path
        d="M 110,440 L 110,210 C 110,210 100,195 130,195 L 205,195 C 205,195 240,240 205,250 C 170,260 145,255 125,245 C 125,245 110,290 110,440"
        stroke="#064e3b"
        strokeWidth="12"
        strokeLinejoin="round"
        fill="#047857"
        fillOpacity="0.15"
      />
      <path
        d="M 110,440 L 110,210 C 110,210 100,195 130,195 L 205,195 C 205,195 240,240 205,250 C 170,260 145,255 125,245"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Right Wall & Awning Outer Border */}
      <path
        d="M 402,440 L 402,210 C 402,210 412,195 382,195 L 307,195 C 307,195 272,240 307,250 C 342,260 367,255 387,245 C 387,245 402,290 402,440"
        stroke="#064e3b"
        strokeWidth="12"
        strokeLinejoin="round"
        fill="#047857"
        fillOpacity="0.15"
      />
      <path
        d="M 402,440 L 402,210 C 402,210 412,195 382,195 L 307,195 C 307,195 272,240 307,250 C 342,260 367,255 387,245"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Central Dynamic Arrow Body & Head */}
      <path
        d="M 215,440 L 215,225 L 165,225 L 256,70 L 347,225 L 297,225 L 297,440 Z"
        stroke="#064e3b"
        strokeWidth="16"
        strokeLinejoin="round"
        fill="#022c22"
      />
      <path
        d="M 215,440 L 215,225 L 165,225 L 256,70 L 347,225 L 297,225 L 297,440 Z"
        stroke="#10b981"
        strokeWidth="8"
        strokeLinejoin="round"
        fill="#047857"
        fillOpacity="0.25"
      />

      {/* PCB Trace Lines & Nodes inside Arrow */}
      {/* Left PCB Branch */}
      <path
        d="M 235,400 L 235,360 L 175,300 L 175,275"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="175" cy="270" r="8" fill="#34d399" stroke="#064e3b" strokeWidth="2" />

      {/* Right PCB Branch */}
      <path
        d="M 277,400 L 277,360 L 337,300 L 337,275"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="337" cy="270" r="8" fill="#34d399" stroke="#064e3b" strokeWidth="2" />

      {/* Central Upward Branch */}
      <path
        d="M 256,410 L 256,215"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="256" cy="205" r="8" fill="#34d399" stroke="#064e3b" strokeWidth="2" />

      {/* Additional PCB visual traces on left and right storefront panels */}
      <path
        d="M 155,420 L 155,340 C 155,340 135,310 155,290"
        stroke="#059669"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 8"
      />
      <circle cx="155" cy="425" r="5" fill="#10b981" />

      <path
        d="M 357,420 L 357,340 C 357,340 377,310 357,290"
        stroke="#059669"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 8"
      />
      <circle cx="357" cy="425" r="5" fill="#10b981" />

      {/* Glowing Crimson/Red Node at the apex of the central arrow */}
      <g>
        {/* Pulse glow background */}
        <circle
          cx="256"
          cy="140"
          r="32"
          fill="#ef4444"
          fillOpacity="0.25"
          className="animate-ping"
          style={{ transformOrigin: "256px 140px" }}
        />
        <circle
          cx="256"
          cy="140"
          r="24"
          fill="#ef4444"
          fillOpacity="0.4"
          className="animate-pulse"
        />
        {/* Core Red Node */}
        <circle
          cx="256"
          cy="140"
          r="16"
          fill="#ef4444"
          stroke="#fee2e2"
          strokeWidth="3"
        />
        <circle
          cx="256"
          cy="140"
          r="6"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}
