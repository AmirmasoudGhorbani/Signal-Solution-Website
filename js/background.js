/* ============================================================
   Animated SIGNAL background
   A living layer behind the lower sections (faded in below the
   hero). Signal language to match the hero & coverage map:
     · a connectivity mesh of drifting nodes + links
     · transmitter nodes that emit expanding broadcast rings
     · data pulses flowing along the links
     · oscilloscope-style radio-wave traces drifting across
     · tiny floating satellites + space rockets (wireframe)
   ============================================================ */
      (function () {
        const canvas = document.getElementById("bg-net");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let W = 0,
          H = 0,
          DPR = 1;
        let nodes = [],
          pulses = [],
          rings = [],
          waves = [],
          txi = [],
          floaters = [],
          shooters = [];
        let satSprite = null,
          rocketSprite = null;
        let raf = null,
          last = 0;
        let mouse = { x: -9999, y: -9999 };
        const LINK = 158;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        /* ---------- wireframe sprites ---------- */
        function makeSatelliteSprite() {
          const S = 72,
            c = document.createElement("canvas");
          c.width = c.height = S;
          const g = c.getContext("2d");
          g.translate(S / 2, S / 2);
          g.strokeStyle = "rgba(170,222,255,0.95)";
          g.lineWidth = 1.6;
          g.lineJoin = "round";
          g.lineCap = "round";
          // central body
          g.strokeRect(-6, -7, 12, 14);
          g.beginPath();
          g.moveTo(-6, -1);
          g.lineTo(6, -1);
          g.stroke();
          // solar panels
          g.strokeRect(-21, -5, 12, 10);
          g.strokeRect(9, -5, 12, 10);
          g.beginPath();
          g.moveTo(-15, -5);
          g.lineTo(-15, 5);
          g.moveTo(15, -5);
          g.lineTo(15, 5);
          g.moveTo(-21, 0);
          g.lineTo(-9, 0);
          g.moveTo(9, 0);
          g.lineTo(21, 0);
          g.stroke();
          // dish + mast
          g.beginPath();
          g.moveTo(0, -7);
          g.lineTo(0, -11);
          g.stroke();
          g.beginPath();
          g.arc(0, -13, 4.5, Math.PI * 0.95, Math.PI * 2.05);
          g.stroke();
          // core glow
          g.fillStyle = "rgba(205,240,255,0.95)";
          g.beginPath();
          g.arc(0, 0, 1.7, 0, Math.PI * 2);
          g.fill();
          return c;
        }
        function makeRocketSprite() {
          const S = 72,
            c = document.createElement("canvas");
          c.width = c.height = S;
          const g = c.getContext("2d");
          g.translate(S / 2, S / 2);
          g.strokeStyle = "rgba(170,222,255,0.95)";
          g.lineWidth = 1.6;
          g.lineJoin = "round";
          g.lineCap = "round";
          // fuselage (points up, -y)
          g.beginPath();
          g.moveTo(0, -19);
          g.quadraticCurveTo(7, -7, 6, 7);
          g.lineTo(6, 11);
          g.lineTo(-6, 11);
          g.lineTo(-6, 7);
          g.quadraticCurveTo(-7, -7, 0, -19);
          g.stroke();
          // window
          g.beginPath();
          g.arc(0, -4, 3, 0, Math.PI * 2);
          g.stroke();
          // fins
          g.beginPath();
          g.moveTo(-6, 5);
          g.lineTo(-12, 13);
          g.lineTo(-6, 11);
          g.moveTo(6, 5);
          g.lineTo(12, 13);
          g.lineTo(6, 11);
          g.stroke();
          // exhaust flame
          g.strokeStyle = "rgba(130,205,255,0.9)";
          g.beginPath();
          g.moveTo(-3.2, 11);
          g.lineTo(0, 19);
          g.lineTo(3.2, 11);
          g.stroke();
          return c;
        }

        function size() {
          stop();
          DPR = Math.min(window.devicePixelRatio || 1, 2);
          W = window.innerWidth;
          H = window.innerHeight;
          canvas.width = W * DPR;
          canvas.height = H * DPR;
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

          const count = Math.max(10, Math.min(28, Math.round((W * H) / 64000)));
          nodes = Array.from({ length: count }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.16,
            vy: (Math.random() - 0.5) * 0.16,
            r: Math.random() * 1.5 + 0.6,
            tw: Math.random() * Math.PI * 2,
          }));
          // transmitter nodes that broadcast radio rings
          txi = [];
          const txCount = Math.max(1, Math.round(count / 22));
          for (let i = 0; i < txCount; i++)
            txi.push((Math.random() * count) | 0);

          // radio-wave traces
          waves = [
            { y: H * 0.34, amp: 16, len: 240, sp: 0.018, ph: 0, op: 0.1 },
            { y: H * 0.72, amp: 22, len: 320, sp: 0.012, ph: 2, op: 0.08 },
          ];

          // floating satellites + rockets
          const big = Math.min(W, H) > 620;
          const kinds = big
            ? ["sat", "rocket", "sat", "rocket"]
            : ["sat", "rocket"];
          floaters = kinds.map((type) => {
            if (type === "rocket") {
              const heading = Math.random() * Math.PI * 2;
              const speed = 0.1 + Math.random() * 0.1;
              return {
                type,
                x: Math.random() * W,
                y: Math.random() * H,
                vx: Math.cos(heading) * speed,
                vy: Math.sin(heading) * speed,
                scale: 0.55 + Math.random() * 0.4,
                bob: Math.random() * Math.PI * 2,
                wob: Math.random() * Math.PI * 2,
              };
            }
            return {
              type,
              x: Math.random() * W,
              y: Math.random() * H,
              vx: (Math.random() - 0.5) * 0.07,
              vy: (Math.random() - 0.5) * 0.07,
              rot: Math.random() * Math.PI * 2,
              vr: (Math.random() - 0.5) * 0.0007,
              scale: 0.6 + Math.random() * 0.5,
              bob: Math.random() * Math.PI * 2,
            };
          });

          rings.length = 0;
          pulses.length = 0;
          start();
        }

        function spawnPulse() {
          if (nodes.length < 2) return;
          const a = nodes[(Math.random() * nodes.length) | 0];
          let best = null,
            bd = LINK * LINK;
          for (const b of nodes) {
            if (b === a) continue;
            const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
            if (d < bd) {
              bd = d;
              best = b;
            }
          }
          if (best)
            pulses.push({
              a,
              b: best,
              t: 0,
              sp: 0.012 + Math.random() * 0.014,
            });
        }
        function spawnRing() {
          // emit from the satellite floater so rings track its live position
          const sat = floaters.find((f) => f.type === "sat");
          if (sat) {
            rings.push({
              ref: sat,
              x: sat.x,
              y: sat.y,
              r: 4,
              max: 180 + Math.random() * 120,
              life: 1,
            });
          } else if (txi.length) {
            const n = nodes[txi[(Math.random() * txi.length) | 0]];
            if (n)
              rings.push({
                x: n.x,
                y: n.y,
                r: 4,
                max: 150 + Math.random() * 120,
                life: 1,
              });
          }
        }
        function spawnShooter() {
          const fromLeft = Math.random() < 0.5;
          const x = fromLeft
            ? -60 + Math.random() * W * 0.35
            : W * 0.65 + Math.random() * W * 0.4;
          const y = -60 + Math.random() * H * 0.25;
          const a =
            (fromLeft ? 0.2 : 0.8) * Math.PI + (Math.random() - 0.5) * 0.18;
          const speed = 7 + Math.random() * 4;
          shooters.push({
            x,
            y,
            vx: Math.cos(a) * speed,
            vy: Math.abs(Math.sin(a)) * speed,
            len: 90 + Math.random() * 90,
            width: 1.1 + Math.random() * 0.9,
            life: 1,
            fade: 0.0006 + Math.random() * 0.0004,
          });
        }

        let pulseTimer = 0,
          ringTimer = 0,
          shooterTimer = 0,
          shooterNext = 2200;
        function frame(now) {
          const dt = Math.min(40, now - last);
          last = now;
          ctx.clearRect(0, 0, W, H);
          ctx.globalCompositeOperation = "lighter";

          // radio-wave traces
          if (!reduce)
            for (const wv of waves) {
              wv.ph += wv.sp * dt * 0.06;
              ctx.beginPath();
              for (let x = -40; x <= W + 40; x += 8) {
                const y =
                  wv.y +
                  Math.sin((x / wv.len) * Math.PI * 2 + wv.ph) * wv.amp +
                  Math.sin(x / (wv.len * 0.4) + wv.ph * 1.7) * wv.amp * 0.35;
                if (x < -38) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.strokeStyle = `rgba(90,190,255,${wv.op})`;
              ctx.lineWidth = 1.3;
              ctx.stroke();
            }

          // move nodes
          if (!reduce)
            for (const n of nodes) {
              n.x += n.vx * dt * 0.06;
              n.y += n.vy * dt * 0.06;
              n.tw += 0.0016 * dt;
              if (n.x < -20) n.x = W + 20;
              if (n.x > W + 20) n.x = -20;
              if (n.y < -20) n.y = H + 20;
              if (n.y > H + 20) n.y = -20;
              const dx = mouse.x - n.x,
                dy = mouse.y - n.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 26000) {
                n.x += dx * 0.0008 * dt;
                n.y += dy * 0.0008 * dt;
              }
            }

          // (mesh links removed — the dense polygon clusters looked unnatural)

          // expanding radio rings
          ringTimer += dt;
          if (ringTimer > 1100 && !reduce) {
            ringTimer = 0;
            spawnRing();
          }
          rings = rings.filter((r) => r.life > 0);
          for (const r of rings) {
            r.r += dt * 0.05;
            r.life = 1 - r.r / r.max;
            if (r.life <= 0) continue;
            const rx = r.ref ? r.ref.x : r.x;
            const ry = r.ref ? r.ref.y + Math.sin(r.ref.bob) * 4 : r.y;
            ctx.beginPath();
            ctx.arc(rx, ry, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(120,205,255,${r.life * 0.28})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // nodes drawing removed — invisible but still move for ring spawn positions

          // data pulses removed — without the mesh links they popped in/out in empty space

          // floating satellites + rockets
          const margin = 70;
          for (const f of floaters) {
            if (!reduce) {
              f.x += f.vx * dt * 0.06;
              f.y += f.vy * dt * 0.06;
              f.bob += 0.0013 * dt;
              if (f.type === "sat") f.rot += f.vr * dt;
              else f.wob += 0.0016 * dt;
            }
            if (f.x < -margin) f.x = W + margin;
            if (f.x > W + margin) f.x = -margin;
            if (f.y < -margin) f.y = H + margin;
            if (f.y > H + margin) f.y = -margin;

            const sp = f.type === "sat" ? satSprite : rocketSprite;
            const s = f.scale;
            const bob = Math.sin(f.bob) * 4;
            let angle;
            if (f.type === "sat") angle = f.rot;
            else
              angle =
                Math.atan2(f.vy, f.vx) + Math.PI / 2 + Math.sin(f.wob) * 0.12;

            ctx.save();
            ctx.translate(f.x, f.y + bob);
            ctx.rotate(angle);
            // soft halo
            const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * s);
            hg.addColorStop(0, "rgba(70,160,255,0.10)");
            hg.addColorStop(1, "rgba(70,160,255,0)");
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(0, 0, 26 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.55;
            ctx.drawImage(
              sp,
              (-sp.width * s) / 2,
              (-sp.height * s) / 2,
              sp.width * s,
              sp.height * s
            );
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // shooting stars (occasional, with a fading tail)
          shooterTimer += dt;
          if (shooterTimer > shooterNext && !reduce) {
            shooterTimer = 0;
            shooterNext = 2600 + Math.random() * 4200;
            spawnShooter();
          }
          shooters = shooters.filter(
            (s) => s.life > 0 && s.x > -200 && s.x < W + 200 && s.y < H + 160
          );
          for (const s of shooters) {
            if (!reduce) {
              s.x += s.vx * dt * 0.09;
              s.y += s.vy * dt * 0.09;
              s.life -= s.fade * dt;
            }
            const sp = Math.hypot(s.vx, s.vy) || 1;
            const tx = s.x - (s.vx / sp) * s.len,
              ty = s.y - (s.vy / sp) * s.len;
            const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
            grad.addColorStop(0, `rgba(228,246,255,${0.9 * s.life})`);
            grad.addColorStop(0.35, `rgba(150,215,255,${0.4 * s.life})`);
            grad.addColorStop(1, "rgba(120,200,255,0)");
            ctx.strokeStyle = grad;
            ctx.lineWidth = s.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.width, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(238,250,255,${0.95 * s.life})`;
            ctx.fill();
          }

          ctx.globalCompositeOperation = "source-over";
          raf = requestAnimationFrame(frame);
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

        function onScroll() {
          const vh = window.innerHeight;
          const o = Math.max(
            0,
            Math.min(1, (window.scrollY - vh * 0.45) / (vh * 0.5))
          );
          canvas.style.opacity = o.toFixed(3);
        }

        window.addEventListener(
          "mousemove",
          (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
          },
          { passive: true }
        );
        window.addEventListener("scroll", onScroll, { passive: true });
        let rt;
        window.addEventListener("resize", () => {
          clearTimeout(rt);
          rt = setTimeout(size, 200);
        });
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) stop();
          else start();
        });

        satSprite = makeSatelliteSprite();
        rocketSprite = makeRocketSprite();
        size();
        onScroll();
        start();
      })();
