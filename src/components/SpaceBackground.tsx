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

    const initStars = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars = [];
      shootingStars = [];
      
      // Twinkling stars far away (some very faint, some brighter)
      for (let i = 0; i < 300; i++) {
        const baseAlpha = Math.random() * 0.6 + 0.15;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.0 + 0.3,
          alpha: baseAlpha,
          baseAlpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.015 + 0.005,
        });
      }
    };

    let animationFrameId: number;

    const drawStars = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Draw faint, twinkling stars
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.fill();

        // Natural soft twinkling glow
        s.alpha += s.twinkleSpeed;
        if (s.alpha > s.baseAlpha + 0.25 || s.alpha > 0.95) {
          s.twinkleSpeed = -Math.abs(s.twinkleSpeed);
        } else if (s.alpha < s.baseAlpha - 0.25 || s.alpha < 0.1) {
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
