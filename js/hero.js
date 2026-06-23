/* ============================================================
   TV Signal Solutions — Particle Morph Hero
   A canvas particle field that samples three reference images
   (dish → satellite → coverage map), morphs between their point
   clouds, drifts gently, and ripples away from the cursor.
   Falls back to a CSS crossfade if pixel-reading is blocked.
   ============================================================ */
      (function () {
        const canvas = document.getElementById("hero-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: true });

        const A = window.TVS_ASSETS || {};
        const IMAGES = [
          { src: A.dish, crop: [0.2, 0.04, 0.74, 0.9], lum: 70, bb: 76 },
          { src: A.satellite, crop: [0.06, 0.1, 0.88, 0.8], lum: 70, bb: 76 },
          // coverage: lower thresholds = denser map; exclude the bottom-left legend box
          {
            src: A.coverage,
            crop: [0.05, 0.04, 0.9, 0.9],
            lum: 52,
            bb: 56,
            gain: 1.25,
            exclude: [[0.02, 0.66, 0.32, 0.34]],
          },
        ];

        const N = 11000; // particle count
        const HOLD = 4600; // ms holding a shape
        const MORPH = 2600; // ms morphing between shapes (longer = gentler)
        const INTRO = 2200; // ms first assembly from dispersed cloud
        const REPEL_R = 130; // cursor influence radius
        const REPEL_F = 26; // cursor push strength

        // easing
        const smoothstep = (t) => {
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          return t * t * (3 - 2 * t);
        };
        const easeInOut = (t) => {
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        let DPR = Math.min(window.devicePixelRatio || 1, 3);
        let W = 0,
          H = 0;
        let clouds = []; // array of Float32Array [x0,y0,x1,y1,...] per image (centered, unit-ish)
        let particles = [];
        let sprites = []; // colour palette of glow sprites
        let spriteBright = null; // bright sprite used on the light-wave crest
        let phase = 0; // current image index
        let phaseStart = 0;
        let morphing = false;
        let intro = true; // first gentle assembly
        let mouse = { x: -9999, y: -9999, active: false };
        let ready = false;
        let raf = null;
        let settle = 1; // eased 0..1: 0 while morphing (calm), 1 when settled

        /* ---------- glow sprites (pre-rendered for speed) ---------- */
        function makeSprite(stops) {
          const s = 32;
          const c = document.createElement("canvas");
          c.width = c.height = s;
          const g = c.getContext("2d");
          const grd = g.createRadialGradient(
            s / 2,
            s / 2,
            0,
            s / 2,
            s / 2,
            s / 2
          );
          stops.forEach(([o, col]) => grd.addColorStop(o, col));
          g.fillStyle = grd;
          g.fillRect(0, 0, s, s);
          return c;
        }
        // weighted palette pick: mostly brand cyan, with ice-white, azure and a hint of indigo
        function pickSprite() {
          const r = Math.random();
          return r < 0.5 ? 0 : r < 0.7 ? 1 : r < 0.88 ? 2 : 3;
        }

        /* ---------- sample one image into an N-length point cloud ---------- */
        function sampleImage(img, spec) {
          const crop = spec.crop,
            lumT = spec.lum,
            bbT = spec.bb;
          const SW = 300; // sampling resolution width
          const ar = img.height / img.width;
          const SH = Math.round(SW * ar);
          const off = document.createElement("canvas");
          off.width = SW;
          off.height = SH;
          const o = off.getContext("2d");
          o.drawImage(img, 0, 0, SW, SH);

          let data;
          try {
            data = o.getImageData(0, 0, SW, SH).data;
          } catch (e) {
            return null; // tainted — trigger fallback
          }

          const [cx, cy, cw, ch] = crop;
          const x0 = cx * SW,
            y0 = cy * SH,
            x1 = (cx + cw) * SW,
            y1 = (cy + ch) * SH;
          const gain = spec.gain || 1;
          // exclusion rects (normalized) -> pixel bounds
          const excl = (spec.exclude || []).map(([ex, ey, ew, eh]) => [
            ex * SW,
            ey * SH,
            (ex + ew) * SW,
            (ey + eh) * SH,
          ]);
          const inExcluded = (x, y) => {
            for (let k = 0; k < excl.length; k++) {
              const e = excl[k];
              if (x >= e[0] && x <= e[2] && y >= e[1] && y <= e[3]) return true;
            }
            return false;
          };
          const pts = [];
          for (let y = 0; y < SH; y += 1) {
            if (y < y0 || y > y1) continue;
            for (let x = 0; x < SW; x += 1) {
              if (x < x0 || x > x1) continue;
              if (inExcluded(x, y)) continue;
              const i = (y * SW + x) * 4;
              const r = data[i],
                g = data[i + 1],
                b = data[i + 2];
              // favour bright cyan/blue glow
              const lum = (r + g + b) / 3;
              const blueBias = b * 0.6 + g * 0.4;
              if (lum > lumT && blueBias > bbT) {
                pts.push(x, y, Math.min(1, (lum / 230) * gain));
              }
            }
          }
          if (pts.length < 30) return null;

          const count = pts.length / 3;
          // normalize to centered unit coords (longest side -> 1)
          const span = Math.max(SW, SH);
          const cloud = new Float32Array(N * 3); // x, y, brightness
          for (let p = 0; p < N; p++) {
            const idx = Math.floor(Math.random() * count) * 3;
            const px = (pts[idx] - SW / 2) / span;
            const py = (pts[idx + 1] - SH / 2) / span;
            cloud[p * 3] = px;
            cloud[p * 3 + 1] = py;
            cloud[p * 3 + 2] = pts[idx + 2];
          }
          return cloud;
        }

        /* ---------- map a unit cloud to current canvas pixels ---------- */
        function scaleFor() {
          const base = Math.min(W, H * 1.15);
          return base * (W > 900 ? 0.92 : 0.86);
        }
        function originFor() {
          const ox = W > 900 ? W * 0.72 : W * 0.66;
          const oy = W > 900 ? H * 0.5 : H * 0.39;
          return [ox, oy];
        }

        function targetXY(p, cloud) {
          const s = scaleFor();
          const [ox, oy] = originFor();
          return [ox + cloud[p * 3] * s, oy + cloud[p * 3 + 1] * s];
        }

        /* ---------- init particles ---------- */
        function initParticles() {
          particles = new Array(N);
          const cloud = clouds[0];
          const [ox, oy] = originFor();
          const disperse = Math.max(W, H) * 0.6;
          for (let p = 0; p < N; p++) {
            const [tx, ty] = targetXY(p, cloud);
            // start dispersed in a soft cloud around the origin for a gentle assembly
            const ang = Math.random() * Math.PI * 2;
            const rad = disperse * (0.35 + Math.random() * 0.65);
            const sx = ox + Math.cos(ang) * rad;
            const sy = oy + Math.sin(ang) * rad * 0.7;
            particles[p] = {
              sx,
              sy, // morph source (home)
              tx,
              ty, // morph target (home)
              hx: sx,
              hy: sy, // current interpolated home
              rx: 0,
              ry: 0,
              rvx: 0,
              rvy: 0, // cursor-ripple displacement
              x: sx,
              y: sy,
              b: cloud[p * 3 + 2],
              ph: Math.random() * Math.PI * 2,
              sp: 0.6 + Math.random() * 0.9,
              spr: pickSprite(),
              st: Math.random() * 0.34, // morph stagger 0..0.34
              arc: (Math.random() - 0.5) * 0.5, // sideways arc during travel
            };
          }
        }

        function setTargets(toIndex) {
          const cloud = clouds[toIndex];
          for (let p = 0; p < N; p++) {
            const pt = particles[p];
            // current home becomes the source for the next morph
            pt.sx = pt.hx;
            pt.sy = pt.hy;
            const [tx, ty] = targetXY(p, cloud);
            pt.tx = tx;
            pt.ty = ty;
            pt.b = cloud[p * 3 + 2];
          }
        }

        // re-fit current shape instantly (used on resize) without animating
        function refitTargets(toIndex) {
          const cloud = clouds[toIndex];
          for (let p = 0; p < N; p++) {
            const pt = particles[p];
            const [tx, ty] = targetXY(p, cloud);
            pt.tx = tx;
            pt.ty = ty;
            pt.sx = tx;
            pt.sy = ty;
            pt.hx = tx;
            pt.hy = ty;
            pt.b = cloud[p * 3 + 2];
          }
        }

        /* ---------- resize ---------- */
        function resize() {
          const rect = canvas.getBoundingClientRect();
          W = rect.width;
          H = rect.height;
          DPR = Math.min(window.devicePixelRatio || 1, 3);
          canvas.width = Math.round(W * DPR);
          canvas.height = Math.round(H * DPR);
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          if (ready) refitTargets(phase); // re-fit current shape
        }

        /* ---------- animation ---------- */
        let t0 = performance.now();
        function frame(now) {
          const dt = Math.min(40, now - t0) / 16.67;
          t0 = now;
          const elapsed = now - phaseStart;

          // ---- phase state machine ----
          let mp = 1; // morph progress 0..1 (1 = settled)
          let interpolating = false;
          if (intro) {
            mp = elapsed / INTRO;
            interpolating = true;
            if (mp >= 1) {
              intro = false;
              mp = 1;
              phase = 0;
              phaseStart = now;
            }
          } else if (!morphing && elapsed > HOLD) {
            morphing = true;
            phaseStart = now;
            setTargets((phase + 1) % clouds.length);
            mp = 0;
            interpolating = true;
          } else if (morphing) {
            mp = elapsed / MORPH;
            interpolating = true;
            if (mp >= 1) {
              morphing = false;
              phase = (phase + 1) % clouds.length;
              phaseStart = now;
              mp = 1;
              interpolating = false;
            }
          }

          ctx.clearRect(0, 0, W, H);
          ctx.globalCompositeOperation = "lighter";

          const SPREAD = 0.34; // matches max per-particle stagger
          // ease drift amplitude between morph (calm) and settled (lively) so there is
          // no visible "pop" the instant a shape finishes assembling
          settle += ((interpolating ? 0 : 1) - settle) * Math.min(1, 0.05 * dt);
          const driftAmp = 0.9 + settle * 1.3; // 0.9 mid-morph -> 2.2 settled

          // light wave: a band sweeping diagonally through the cloud, brightening dots
          const [oxW, oyW] = originFor();
          const sW = scaleFor();
          const WAVE_PERIOD = 5000,
            WAVE_SWEEP = 2700;
          const wph = now % WAVE_PERIOD;
          let waveX = null;
          if (wph < WAVE_SWEEP)
            waveX = oxW - sW * 0.66 + sW * 1.32 * (wph / WAVE_SWEEP);
          const WAVE_W = sW * 0.17;

          for (let p = 0; p < N; p++) {
            const pt = particles[p];

            // ---- base "home" position via parametric interpolation (no overshoot) ----
            if (interpolating) {
              const local = (mp - pt.st) / (1 - SPREAD);
              const e = smoothstep(local);
              const dx = pt.tx - pt.sx,
                dy = pt.ty - pt.sy;
              pt.hx = pt.sx + dx * e;
              pt.hy = pt.sy + dy * e;
              // gentle sideways arc so travel feels organic, peaks mid-flight
              const bow = Math.sin(e * Math.PI) * pt.arc;
              pt.hx += -dy * bow * 0.12;
              pt.hy += dx * bow * 0.12;
            } else {
              pt.hx = pt.tx;
              pt.hy = pt.ty;
            }

            // ---- gentle idle drift (kept small, additive) ----
            pt.ph += 0.01 * pt.sp;
            const driftx = Math.cos(pt.ph) * driftAmp;
            const drifty = Math.sin(pt.ph * 1.3) * driftAmp;

            // ---- cursor ripple: springy displacement that returns to zero ----
            if (mouse.active) {
              const ddx = pt.hx + pt.rx - mouse.x,
                ddy = pt.hy + pt.ry - mouse.y;
              const d2 = ddx * ddx + ddy * ddy;
              if (d2 < REPEL_R * REPEL_R) {
                const d = Math.sqrt(d2) || 1;
                const f = (1 - d / REPEL_R) * REPEL_F * 0.12;
                pt.rvx += (ddx / d) * f;
                pt.rvy += (ddy / d) * f;
              }
            }
            pt.rvx += -pt.rx * 0.1; // spring back home
            pt.rvy += -pt.ry * 0.1;
            pt.rvx *= 0.86;
            pt.rvy *= 0.86;
            pt.rx += pt.rvx * dt;
            pt.ry += pt.rvy * dt;

            pt.x = pt.hx + driftx + pt.rx;
            pt.y = pt.hy + drifty + pt.ry;

            const tw = 0.78 + 0.22 * Math.sin(pt.ph * 2);
            // light-wave crest boost (slight diagonal band)
            let wb = 0;
            if (waveX !== null) {
              const dd = Math.abs(pt.x - waveX + (pt.y - oyW) * 0.22);
              if (dd < WAVE_W) {
                wb = 1 - dd / WAVE_W;
                wb *= wb;
              }
            }
            const size = (2.4 + pt.b * 7) * tw * (1 + wb * 1.5);
            ctx.globalAlpha = Math.min(
              1,
              (0.55 + pt.b * 0.45) * tw + wb * 0.55
            );
            const spr = wb > 0.4 ? spriteBright : sprites[pt.spr];
            ctx.drawImage(spr, pt.x - size / 2, pt.y - size / 2, size, size);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";

          raf = requestAnimationFrame(frame);
        }

        /* ---------- fallback: CSS crossfade of the real images ---------- */
        function fallback() {
          canvas.style.display = "none";
          const fb = document.getElementById("hero-fallback");
          if (!fb) return;
          fb.classList.add("active");
          fb.innerHTML = "";
          const layers = IMAGES.map((spec) => {
            const d = document.createElement("div");
            d.className = "hero-fb-img";
            if (spec.src) d.style.backgroundImage = `url("${spec.src}")`;
            fb.appendChild(d);
            return d;
          });
          let i = 0;
          layers[0].classList.add("show");
          setInterval(() => {
            layers[i].classList.remove("show");
            i = (i + 1) % layers.length;
            layers[i].classList.add("show");
          }, HOLD + MORPH);
        }

        /* ---------- boot ---------- */
        function boot() {
          sprites = [
            makeSprite([
              [0, "rgba(232,248,255,1)"],
              [0.18, "rgba(150,225,255,0.95)"],
              [0.45, "rgba(70,180,255,0.55)"],
              [0.75, "rgba(34,150,255,0.18)"],
              [1, "rgba(20,120,255,0)"],
            ]), // brand cyan
            makeSprite([
              [0, "rgba(255,255,255,1)"],
              [0.22, "rgba(223,243,255,0.92)"],
              [0.5, "rgba(159,212,255,0.45)"],
              [0.8, "rgba(120,180,255,0.14)"],
              [1, "rgba(120,180,255,0)"],
            ]), // ice white
            makeSprite([
              [0, "rgba(200,245,255,1)"],
              [0.2, "rgba(80,210,255,0.95)"],
              [0.5, "rgba(30,150,255,0.5)"],
              [0.8, "rgba(20,110,255,0.16)"],
              [1, "rgba(20,110,255,0)"],
            ]), // azure
            makeSprite([
              [0, "rgba(224,230,255,1)"],
              [0.22, "rgba(150,170,255,0.9)"],
              [0.52, "rgba(95,110,240,0.45)"],
              [0.8, "rgba(70,90,220,0.14)"],
              [1, "rgba(70,90,220,0)"],
            ]), // indigo hint
          ];
          spriteBright = makeSprite([
            [0, "rgba(255,255,255,1)"],
            [0.3, "rgba(234,246,255,0.95)"],
            [0.6, "rgba(180,228,255,0.5)"],
            [0.85, "rgba(120,200,255,0.16)"],
            [1, "rgba(120,200,255,0)"],
          ]);
          resize();

          let loaded = 0,
            failed = false;
          const imgs = IMAGES.map((spec) => {
            const im = new Image();
            im.src = spec.src;
            return { im, spec };
          });

          Promise.all(
            imgs.map(
              ({ im }) =>
                new Promise((res) => {
                  if (im.complete) return res();
                  im.onload = () => res();
                  im.onerror = () => {
                    failed = true;
                    res();
                  };
                })
            )
          ).then(() => {
            if (failed) {
              fallback();
              return;
            }
            clouds = imgs.map(({ im, spec }) => sampleImage(im, spec));
            if (clouds.some((c) => !c)) {
              fallback();
              return;
            }
            initParticles();
            ready = true;
            phaseStart = performance.now();
            raf = requestAnimationFrame(frame);
          });
        }

        /* ---------- events ---------- */
        function onMove(cx, cy) {
          const rect = canvas.getBoundingClientRect();
          mouse.x = cx - rect.left;
          mouse.y = cy - rect.top;
          mouse.active = true;
        }
        canvas.addEventListener("mousemove", (e) =>
          onMove(e.clientX, e.clientY)
        );
        canvas.addEventListener("mouseleave", () => {
          mouse.active = false;
          mouse.x = mouse.y = -9999;
        });
        canvas.addEventListener(
          "touchmove",
          (e) => {
            if (e.touches[0])
              onMove(e.touches[0].clientX, e.touches[0].clientY);
          },
          { passive: true }
        );
        canvas.addEventListener("touchend", () => {
          mouse.active = false;
        });

        let rt;
        window.addEventListener("resize", () => {
          clearTimeout(rt);
          rt = setTimeout(resize, 150);
        });

        document.addEventListener("visibilitychange", () => {
          if (document.hidden && raf) {
            cancelAnimationFrame(raf);
            raf = null;
          } else if (!document.hidden && ready && !raf) {
            t0 = performance.now();
            raf = requestAnimationFrame(frame);
          }
        });

        if (document.readyState !== "loading") boot();
        else document.addEventListener("DOMContentLoaded", boot);
      })();
