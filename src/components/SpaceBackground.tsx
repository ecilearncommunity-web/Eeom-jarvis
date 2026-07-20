import React, { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface Star {
      x: number;
      y: number;
      r: number;
      alpha: number;
      twinkleSpeed: number;
      baseAlpha: number;
      color: string;
      isShiningFlare?: boolean;
      flareSize?: number;
    }

    interface ShootingStar {
      x: number;
      y: number;
      dx: number;
      dy: number;
      length: number;
      speed: number;
      alpha: number;
      active: boolean;
    }

    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];

    const starColors = [
      "rgba(255, 255, 255,", // Pure white
      "rgba(103, 232, 249,", // Bright cyan
      "rgba(192, 132, 252,", // Warm purple
      "rgba(253, 224, 71,",  // Golden yellow
      "rgba(165, 243, 252,"  // Ice blue
    ];

    const initStars = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars = [];
      shootingStars = [];
      
      // 1. Distant, tiny background stars (high density, very subtle)
      for (let i = 0; i < 220; i++) {
        const baseAlpha = Math.random() * 0.35 + 0.1;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 0.7 + 0.2,
          alpha: baseAlpha,
          baseAlpha: baseAlpha,
          twinkleSpeed: (Math.random() * 0.006 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          color: starColors[Math.floor(Math.random() * 2)], // white or cyan
        });
      }

      // 2. Medium bright colorful stars (medium density)
      for (let i = 0; i < 80; i++) {
        const baseAlpha = Math.random() * 0.5 + 0.25;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.1 + 0.7,
          alpha: baseAlpha,
          baseAlpha: baseAlpha,
          twinkleSpeed: (Math.random() * 0.012 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }

      // 3. Majestic shining flare stars (low density, sparkling cross flares)
      for (let i = 0; i < 15; i++) {
        const baseAlpha = Math.random() * 0.4 + 0.45;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.2 + 1.3,
          alpha: baseAlpha,
          baseAlpha: baseAlpha,
          twinkleSpeed: (Math.random() * 0.018 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
          color: starColors[Math.floor(Math.random() * 3)], // white, cyan, or purple
          isShiningFlare: true,
          flareSize: Math.random() * 7 + 6,
        });
      }
    };

    let animationFrameId: number;

    const drawStars = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Draw beautiful, twinkling stars
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `${s.color}${s.alpha})`;
        ctx.fill();

        // If the star is a majestic flare star, draw a glowing 4-point cross lens flare!
        if (s.isShiningFlare && s.alpha > 0.2) {
          const flareSize = (s.flareSize || 8) * s.alpha;
          ctx.beginPath();
          ctx.strokeStyle = `${s.color}${s.alpha * 0.55})`;
          ctx.lineWidth = 0.85;
          // Horizontal glow line
          ctx.moveTo(s.x - flareSize, s.y);
          ctx.lineTo(s.x + flareSize, s.y);
          // Vertical glow line
          ctx.moveTo(s.x, s.y - flareSize);
          ctx.lineTo(s.x, s.y + flareSize);
          ctx.stroke();

          // Core diamond bloom
          ctx.beginPath();
          ctx.fillStyle = `${s.color}${s.alpha * 0.35})`;
          ctx.moveTo(s.x, s.y - 3);
          ctx.lineTo(s.x + 3, s.y);
          ctx.lineTo(s.x, s.y + 3);
          ctx.lineTo(s.x - 3, s.y);
          ctx.closePath();
          ctx.fill();
        }

        // Natural soft twinkling glow oscillation
        s.alpha += s.twinkleSpeed;
        if (s.alpha > s.baseAlpha + 0.25 || s.alpha > 0.95) {
          s.twinkleSpeed = -Math.abs(s.twinkleSpeed);
        } else if (s.alpha < s.baseAlpha - 0.25 || s.alpha < 0.08) {
          s.twinkleSpeed = Math.abs(s.twinkleSpeed);
        }
      });

      // Spawn a shooting star occasionally (randomized interval)
      if (Math.random() < 0.015 && shootingStars.filter((s) => s.active).length < 2) {
        const angle = Math.PI / 6 + Math.random() * (Math.PI / 6); // Slanted direction downward-left
        shootingStars.push({
          x: Math.random() * (width * 0.8) + (width * 0.1),
          y: -20,
          dx: -Math.cos(angle),
          dy: Math.sin(angle),
          length: Math.random() * 100 + 60,
          speed: Math.random() * 15 + 12,
          alpha: 1.0,
          active: true,
        });
      }

      // Draw & animate shooting stars
      shootingStars.forEach((star) => {
        if (!star.active) return;

        const grad = ctx.createLinearGradient(
          star.x,
          star.y,
          star.x - star.dx * star.length,
          star.y - star.dy * star.length
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${star.alpha})`);
        grad.addColorStop(0.2, `rgba(0, 243, 255, ${star.alpha * 0.7})`);
        grad.addColorStop(1, "rgba(0, 243, 255, 0)");

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.dx * star.length, star.y - star.dy * star.length);
        ctx.stroke();

        // Update coordinate
        star.x += star.dx * star.speed;
        star.y += star.dy * star.speed;
        star.alpha -= 0.025; // Speed up fading slightly

        if (
          star.x < -150 ||
          star.x > width + 150 ||
          star.y < -150 ||
          star.y > height + 150 ||
          star.alpha <= 0
        ) {
          star.active = false;
        }
      });

      // Filter inactive shooting stars to keep memory footprint clean
      shootingStars = shootingStars.filter((s) => s.active);

      animationFrameId = requestAnimationFrame(drawStars);
    };

    initStars();
    drawStars();

    const handleResize = () => {
      initStars();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ background: "transparent" }}
      />
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at 40% 40%, rgba(37, 99, 235, 0.04) 0%, transparent 60%),
                       radial-gradient(circle at 60% 60%, rgba(139, 92, 246, 0.04) 0%, transparent 50%)`
        }}
      />
    </>
  );
}
