import { useEffect, useRef } from "react";

const PHASE_CONFIG = {
  rising:   { bubbleCount: 8,  fillLevel: 0.55, speed: 1.4 },
  peak:     { bubbleCount: 16, fillLevel: 0.75, speed: 2.0 },
  declining:{ bubbleCount: 5,  fillLevel: 0.65, speed: 0.8 },
  hungry:   { bubbleCount: 1,  fillLevel: 0.35, speed: 0.4 },
};

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function makeBubble(W, H) {
  const jarLeft  = W * 0.22;
  const jarRight = W * 0.78;
  return {
    x:       jarLeft + Math.random() * (jarRight - jarLeft),
    y:       H * 0.85 + Math.random() * H * 0.05,
    r:       1.2 + Math.random() * 2.8,
    speed:   0.3 + Math.random() * 1.0,
    opacity: 0.25 + Math.random() * 0.5,
  };
}

export default function JarAnimation({ phase = "hungry", progress = 0 }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ bubbles: [], fillLevel: 0.35, frameId: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W   = canvas.width;
    const H   = canvas.height;

    const cfg         = PHASE_CONFIG[phase] ?? PHASE_CONFIG.hungry;
    const targetFill  = lerp(PHASE_CONFIG.hungry.fillLevel, cfg.fillLevel, progress / 100);
    const targetCount = Math.round(lerp(1, cfg.bubbleCount, progress / 100));
    const state       = stateRef.current;

    if (state.bubbles.length === 0) {
      for (let i = 0; i < 20; i++) state.bubbles.push(makeBubble(W, H));
    }

    const jl    = W * 0.22;
    const jr    = W * 0.78;
    const jb    = H * 0.90;
    const jt    = H * 0.10;
    const neckH = H * 0.10;
    const neckL = W * 0.28;
    const neckR = W * 0.72;

    function jarPath(ctx) {
      ctx.beginPath();
      ctx.moveTo(neckL, jt);
      ctx.lineTo(neckR, jt);
      ctx.lineTo(jr,    jt + neckH);
      ctx.lineTo(jr,    jb);
      ctx.lineTo(jl,    jb);
      ctx.lineTo(jl,    jt + neckH);
      ctx.closePath();
    }

    function drawFill(ctx, fillLevel) {
      const fillTop = jb - (jb - (jt + neckH)) * fillLevel;
      const t       = Date.now() / 900;
      const amp     = 1.5;
      const freq    = 0.06;
      ctx.beginPath();
      ctx.moveTo(jl, jb);
      ctx.lineTo(jl, fillTop + Math.sin(t) * amp);
      for (let x = jl; x <= jr; x += 3) {
        ctx.lineTo(x, fillTop + Math.sin(x * freq + t) * amp);
      }
      ctx.lineTo(jr, jb);
      ctx.closePath();
      ctx.fillStyle = "rgba(134, 187, 161, 0.30)";
      ctx.fill();
    }

    function drawJarOutline(ctx) {
      jarPath(ctx);
      ctx.strokeStyle = "rgba(100, 160, 130, 0.60)";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(jl + 6, jt + neckH + 6);
      ctx.lineTo(jl + 6, jb - 10);
      ctx.strokeStyle = "rgba(200, 230, 215, 0.25)";
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    function drawLid(ctx) {
      const lidH = H * 0.045;
      ctx.fillStyle   = "rgba(100, 160, 130, 0.20)";
      ctx.strokeStyle = "rgba(100, 160, 130, 0.55)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.rect(neckL - 2, jt - lidH, (neckR - neckL) + 4, lidH);
      ctx.fill();
      ctx.stroke();
    }

    function drawBubbles(ctx, count, speed) {
      const fillTop = jb - (jb - (jt + neckH)) * state.fillLevel;
      state.bubbles.forEach((b, i) => {
        if (i >= count) return;
        b.y -= b.speed * speed * 0.55;
        if (b.y < fillTop) {
          b.y       = jb - Math.random() * H * 0.04;
          b.opacity = 0.25 + Math.random() * 0.5;
          b.x       = jl + 6 + Math.random() * (jr - jl - 12);
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle   = `rgba(160, 210, 185, ${b.opacity})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(100, 170, 140, ${b.opacity * 0.5})`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      });
    }

    function drawMarkers(ctx) {
      [0.25, 0.50, 0.75].forEach(lvl => {
        const y = jb - (jb - (jt + neckH)) * lvl;
        ctx.beginPath();
        ctx.moveTo(jl + 4, y);
        ctx.lineTo(jl + 10, y);
        ctx.strokeStyle = "rgba(100, 160, 130, 0.25)";
        ctx.lineWidth   = 0.75;
        ctx.stroke();
      });
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      jarPath(ctx);
      ctx.clip();
      state.fillLevel += (targetFill - state.fillLevel) * 0.025;
      drawFill(ctx, state.fillLevel);
      drawBubbles(ctx, targetCount, cfg.speed);
      ctx.restore();
      drawMarkers(ctx);
      drawJarOutline(ctx);
      drawLid(ctx);
      state.frameId = requestAnimationFrame(tick);
    }

    state.frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(state.frameId);
  }, [phase, progress]);

  return (
    <canvas ref={canvasRef} width={120} height={180} style={{ display: "block", flexShrink: 0 }} />
  );
}
