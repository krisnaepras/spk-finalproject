"use client";

import { useEffect, useRef } from "react";

export const BackgroundAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let pulses: Pulse[] = [];
    let shootingStars: ShootingStar[] = [];
    let mouse = { x: -1000, y: -1000 };

    // Configuration - Light Theme Edition
    const config = {
      particleCount: 100, // Increased density
      connectionDistance: 160,
      mouseDistance: 300,
      baseColor: "rgba(14, 165, 233, 0.7)",
      pulseColor: "rgba(6, 182, 212, 0.9)",
      pulseSpeed: 3, // Faster data
      pulseChance: 0.01, // More traffic
      shootingStarChance: 0.005, // Occasional shooting star
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseX: number;
      baseY: number;
      density: number;
      color: string;
      angle: number;
      spinSpeed: number;

      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() - 0.5) * 0.8; // Faster movement
        this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2.5 + 1;
        this.density = (Math.random() * 30) + 1;
        this.angle = Math.random() * 360;
        this.spinSpeed = Math.random() * 0.05 - 0.025;
        
        // Soft Light Palette
        const colors = ["#0ea5e9", "#06b6d4", "#14b8a6", "#3b82f6", "#6366f1"];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(width: number, height: number) {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spinSpeed;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.mouseDistance) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (config.mouseDistance - distance) / config.mouseDistance;
          const directionX = forceDirectionX * force * this.density;
          const directionY = forceDirectionY * force * this.density;
          
          this.x -= directionX * 0.8; // Stronger repulsion
          this.y -= directionY * 0.8;
        } else {
            if (this.x !== this.baseX) {
                const dx = this.x - this.baseX;
                this.x -= dx/40;
            }
             if (this.y !== this.baseY) {
                const dy = this.y - this.baseY;
                this.y -= dy/40;
            }
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Soft Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
      }
    }

    class Pulse {
      p1: Particle;
      p2: Particle;
      progress: number;
      speed: number;
      dead: boolean;

      constructor(p1: Particle, p2: Particle) {
        this.p1 = p1;
        this.p2 = p2;
        this.progress = 0;
        this.speed = config.pulseSpeed / 100;
        this.dead = false;
      }

      update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
          this.dead = true;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.dead) return;
        
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        
        const x = this.p1.x + dx * this.progress;
        const y = this.p1.y + dy * this.progress;

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = config.pulseColor;
        ctx.fill();
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#06b6d4";
      }
    }

    class ShootingStar {
      x: number;
      y: number;
      len: number;
      speed: number;
      size: number;
      waitTime: number;
      active: boolean;
      angle: number;

      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.len = Math.random() * 80 + 10;
        this.speed = Math.random() * 10 + 6;
        this.size = Math.random() * 1 + 0.1;
        this.waitTime = new Date().getTime() + Math.random() * 3000 + 500;
        this.active = false;
        this.angle = -45; // Diagonal movement
      }

      update(width: number, height: number) {
        if (this.active) {
          this.x -= this.speed;
          this.y += this.speed;
          if (this.x < 0 || this.y > height) {
            this.active = false;
            this.waitTime = new Date().getTime() + Math.random() * 3000 + 500;
          }
        } else {
          if (new Date().getTime() >= this.waitTime) {
            this.active = true;
            this.x = Math.random() * width + 200; // Start slightly off screen
            this.y = -100;
          }
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(14, 165, 233, 0.5)";
        ctx.lineWidth = this.size;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.len, this.y - this.len);
        ctx.stroke();

        // Star head
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#0ea5e9";
        ctx.fill();
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#0ea5e9";
      }
    }

    const init = () => {
      resize();
      particles = [];
      pulses = [];
      shootingStars = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
      // Add a few shooting stars
      for (let i = 0; i < 3; i++) {
          shootingStars.push(new ShootingStar(canvas.width, canvas.height));
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Reset shadow
      ctx.shadowBlur = 0;

      // Update particles
      particles.forEach((particle) => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      // Draw connections
      particles.forEach((p1, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < config.connectionDistance) {
            ctx.beginPath();
            const opacity = 1 - distance / config.connectionDistance;
            ctx.strokeStyle = `rgba(14, 165, 233, ${opacity * 0.25})`; 
            ctx.lineWidth = 1;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            if (Math.random() < config.pulseChance) {
              pulses.push(new Pulse(p1, p2));
            }
          }
        }
      });

      // Pulses
      pulses = pulses.filter(p => !p.dead);
      pulses.forEach(pulse => {
        pulse.update();
        pulse.draw(ctx);
      });

      // Shooting Stars
      shootingStars.forEach(star => {
          star.update(canvas.width, canvas.height);
          star.draw(ctx);
      });

      // Mouse Glow
      if (mouse.x > 0) {
          const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400);
          gradient.addColorStop(0, "rgba(14, 165, 233, 0.08)"); // Sky blue glow
          gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.04)"); // Cyan fade
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleMouseLeave = () => {
        mouse.x = -1000;
        mouse.y = -1000;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    
    init();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full pointer-events-none"
      style={{ background: "transparent" }} 
    />
  );
};
