import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  volume: number;
  accentColor: string;
}

export default function AudioVisualizer({ isPlaying, volume, accentColor }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Mathematical wave configuration
    const waves = [
      { amplitude: 35, frequency: 0.008, speed: 0.06, color: accentColor + 'cc', phase: 0 },
      { amplitude: 20, frequency: 0.015, speed: -0.04, color: accentColor + '80', phase: 2 },
      { amplitude: 15, frequency: 0.02, speed: 0.08, color: accentColor + '40', phase: 4 },
      { amplitude: 8, frequency: 0.03, speed: -0.05, color: '#FFFFFF33', phase: 1 }
    ];

    let phaseOffset = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Procedural wave simulation
      const activityLevel = isPlaying ? (volume / 100) * 0.8 + 0.2 : 0.05;
      phaseOffset += isPlaying ? 0.02 : 0.005;

      waves.forEach((wave, i) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = i === 0 ? 3 : 1.5;
        ctx.lineCap = 'round';

        // Add subtle shadow glow
        if (i === 0) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = accentColor;
        } else {
          ctx.shadowBlur = 0;
        }

        for (let x = 0; x < width; x += 2) {
          const relativeX = x / width;
          // Apply envelope to taper waves at both left and right screen edges
          const envelope = Math.sin(relativeX * Math.PI);

          const y =
            height / 2 +
            Math.sin(x * wave.frequency + wave.phase + phaseOffset * wave.speed * 15) *
              wave.amplitude *
              envelope *
              activityLevel +
            Math.cos(x * 0.004 + phaseOffset) * 10 * envelope * activityLevel;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Ambient background lighting pulse
      if (isPlaying) {
        ctx.shadowBlur = 0;
        const pulse = Math.sin(phaseOffset * 2) * 10 + 20;
        const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(100, width / 2));
        grad.addColorStop(0, accentColor + '0d');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.max(200, width), 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isPlaying, volume, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      id="audio-visualizer-canvas"
      className="w-full h-full rounded-2xl block select-none pointer-events-none"
    />
  );
}
