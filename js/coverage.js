/* ============================================================
   Coverage map — live signal overlay
   Draws expanding radar rings, a slow sweep, and signal pulses
   broadcasting outward from the Auckland hub over the map image.
   ============================================================ */
      (function () {
        const canvas = document.getElementById("cov-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const map = canvas.closest(".cov-map");

        let W = 0,
          H = 0,
          DPR = 1;
        let cx = 0,
          cy = 0; // Auckland hub (px)
        const CX = 0.455,
          CY = 0.46; // normalized hub position on the image
        let rings = [];
        let pulses = [];
        let twinkles = [];
        let sweep = 0;
        let raf = null,
          last = 0;
        let visible = true;

        function resize() {
          const r = canvas.getBoundingClientRect();
          W = r.width;
          H = r.height;
          DPR = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(W * DPR);
          canvas.height = Math.round(H * DPR);
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          cx = W * CX;
          cy = H * CY;
        }

        function spawnRing() {
          rings.push({ r: 6, life: 1 });
        }
        function spawnPulse() {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.min(W, H) * (0.28 + Math.random() * 0.5);
          pulses.push({
            ang,
            t: 0,
            dist,
            speed: 0.006 + Math.random() * 0.006,
          });
        }
        function spawnTwinkle() {
          twinkles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            t: 0,
            life: 0.5 + Math.random() * 0.6,
            r: 1 + Math.random() * 1.8,
          });
        }

        let ringTimer = 0,
          pulseTimer = 0,
          twinkTimer = 0;

        function frame(now) {
          const dt = Math.min(40, now - last);
          last = now;
          ctx.clearRect(0, 0, W, H);
          ctx.globalCompositeOperation = "lighter";

          // timers
          ringTimer += dt;
          pulseTimer += dt;
          twinkTimer += dt;
          if (ringTimer > 1500) {
            ringTimer = 0;
            spawnRing();
          }
          if (pulseTimer > 520) {
            pulseTimer = 0;
            spawnPulse();
          }
          if (twinkTimer > 140) {
            twinkTimer = 0;
            spawnTwinkle();
          }

          const maxR = Math.min(W, H) * 0.92;

          // radar sweep
          sweep += dt * 0.00042;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
          grad.addColorStop(0, "rgba(46,163,255,0.10)");
          grad.addColorStop(1, "rgba(46,163,255,0)");
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(sweep);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, maxR, -0.32, 0.0);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();

          // expanding rings
          rings = rings.filter((r) => r.life > 0);
          rings.forEach((rg) => {
            rg.r += dt * 0.045;
            rg.life -= dt / 4200;
            ctx.beginPath();
            ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(97,212,255,${Math.max(0, rg.life) * 0.5})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          });

          // signal pulses travelling outward with a trail
          pulses = pulses.filter((p) => p.t < 1);
          pulses.forEach((p) => {
            p.t += dt * p.speed;
            const e = p.t;
            const px = cx + Math.cos(p.ang) * p.dist * e;
            const py = cy + Math.sin(p.ang) * p.dist * e * 0.62; // flatten for the iso map
            const tx = cx + Math.cos(p.ang) * p.dist * Math.max(0, e - 0.16);
            const ty =
              cy + Math.sin(p.ang) * p.dist * Math.max(0, e - 0.16) * 0.62;
            const a = Math.sin(p.t * Math.PI);
            const lg = ctx.createLinearGradient(tx, ty, px, py);
            lg.addColorStop(0, "rgba(97,212,255,0)");
            lg.addColorStop(1, `rgba(150,225,255,${a})`);
            ctx.strokeStyle = lg;
            ctx.lineWidth = 1.6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(px, py);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px, py, 2.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,240,255,${a})`;
            ctx.fill();
          });

          // twinkles
          twinkles = twinkles.filter((t) => t.t < t.life);
          twinkles.forEach((t) => {
            t.t += dt / 1000;
            const a = Math.sin((t.t / t.life) * Math.PI) * 0.7;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(120,200,255,${a})`;
            ctx.fill();
          });

          // hub glow
          const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
          hub.addColorStop(0, "rgba(210,240,255,0.9)");
          hub.addColorStop(0.4, "rgba(97,212,255,0.5)");
          hub.addColorStop(1, "rgba(46,163,255,0)");
          ctx.fillStyle = hub;
          ctx.beginPath();
          ctx.arc(cx, cy, 26, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalCompositeOperation = "source-over";
          if (visible) raf = requestAnimationFrame(frame);
        }

        function start() {
          if (!raf) {
            last = performance.now();
            raf = requestAnimationFrame(frame);
          }
        }
        function stop() {
          if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        }

        // only animate when on screen
        const io = new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              visible = e.isIntersecting;
              if (visible) start();
              else stop();
            });
          },
          { threshold: 0.05 }
        );

        function boot() {
          resize();
          io.observe(map);
          let rt;
          window.addEventListener("resize", () => {
            clearTimeout(rt);
            rt = setTimeout(resize, 150);
          });
        }
        if (document.readyState !== "loading") boot();
        else document.addEventListener("DOMContentLoaded", boot);
      })();
      document.getElementById("cov-img").src = window.TVS_ASSETS.coverage;
