/* ============================================================
   3D Liquid-Glass Service Carousel  (React + rAF, 60fps)
   - continuous circular "progress" scroll
   - mouse parallax tilt with inertia damping (lags the cursor)
   - volumetric card thickness via stacked depth layers
   - smoothstep side-push + perspective hide off-screen
   ============================================================ */
      (function () {
        const { useState, useRef, useEffect } = React;

        const ICONS = {
          aerial: "M5 21 12 4l7 17 M8.5 13h7 M12 4 16 2 M12 4 8 2",
          sat: "M4 14a8 8 0 0 1 8-8 M4 18a12 12 0 0 1 12-12 M13 11 20 4 M17 5l3-1-1 3",
          tune: "M8 21h8 M12 18v3 M7 13h2v2H7z M11 10h2v5h-2z M15 8h2v7h-2z",
          cell: "M11 18.5h2 M3 9a6 6 0 0 1 0 6 M21 9a6 6 0 0 1 0 6",
          wifi: "M2 8.5a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8.5 15.5a6 6 0 0 1 7 0",
          cctv: "M3 7.5 13.5 5l1 4L4 11.5z M14 7.5 20 6 M11 12v5a2 2 0 0 1-2 2H6",
          dev: "M8.5 8.5 5 12l3.5 3.5 M15.5 8.5 19 12l-3.5 3.5 M13.5 6.5l-3 11",
        };
        const EXTRA = {
          sat: React.createElement("circle", {
            cx: 6,
            cy: 16,
            r: 2.2,
            key: "c",
          }),
          cell: React.createElement("rect", {
            x: 7,
            y: 2.5,
            width: 10,
            height: 19,
            rx: 2.5,
            key: "r",
          }),
          cctv: React.createElement("circle", {
            cx: 9,
            cy: 8.2,
            r: 1.3,
            key: "c",
          }),
          tune: React.createElement("rect", {
            x: 2.5,
            y: 5,
            width: 19,
            height: 13,
            rx: 2,
            key: "r",
          }),
          wifi: React.createElement("circle", {
            cx: 12,
            cy: 19,
            r: 1.4,
            fill: "currentColor",
            key: "c",
          }),
        };

        // Web & App development — the carousel card scrolls to the dedicated developer section.
        const DEV_CONTACT = window.TVS_DEV_CONTACT || "#developer";

        const SERVICES = [
          {
            ic: "aerial",
            n: "01",
            t: "TV Aerials & Antennas",
            d: "Say goodbye to fuzzy pictures and frozen channels. We install, repair and upgrade UHF aerials, Freeview and FM antennas — multi-room points included — for crystal-clear reception on every screen.",
            tags: ["UHF", "Freeview", "FM", "Multi-room"],
          },
          {
            ic: "sat",
            n: "02",
            t: "Satellite & Starlink",
            d: "Open up a world of viewing with a properly aligned satellite dish — and step into fast, future-ready internet with tidy, professional Starlink setup, wherever you live.",
            tags: ["Dish install", "Satellite TV", "Starlink"],
          },
          {
            ic: "tune",
            n: "03",
            t: "Reception & Tuning",
            d: "Pixelation, dropouts or channels gone missing? We track the fault down on-site and fine-tune your system so every channel comes through sharp — and stays that way.",
            tags: ["Retuning", "Fault finding", "Signal boost"],
          },
          {
            ic: "cell",
            n: "04",
            t: "4G & Cell Signal",
            d: "Patchy mobile coverage at home or out rurally? We boost your cellular signal and set up 4G modems for fast, dependable connection in every corner of the property.",
            tags: ["Signal boost", "4G modem", "Rural"],
          },
          {
            ic: "wifi",
            n: "05",
            t: "WiFi & Networking",
            d: "Enjoy seamless WiFi in every room. We design, install and optimise mesh networks and cabling so dead zones, buffering and dropouts become a thing of the past.",
            tags: ["Mesh WiFi", "Networking", "Optimisation"],
          },
          {
            ic: "cctv",
            n: "06",
            t: "CCTV, Security & IT",
            d: "Keep an eye on what matters with professionally installed CCTV and smart-home security — backed by friendly, no-jargon IT support for all your connected devices.",
            tags: ["CCTV", "Smart home", "IT support"],
          },
          {
            ic: "dev",
            n: "07",
            t: "Websites & Apps",
            d: "Like what you see? The same hands built this site. We design and develop fast, modern websites, web apps and mobile apps — end to end, no agency middleman.",
            tags: ["Web design", "Mobile apps", "UI / UX"],
          },
        ];

        // smoothstep
        const smooth = (e0, e1, x) => {
          const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
          return t * t * (3 - 2 * t);
        };

        const N_SVC = SERVICES.length;
        const GAP_PX = 300;
        // static layout for a given circular offset — used for initial paint
        // and as the single source of truth the rAF loop also uses.
        function layout(off, tx, ty) {
          const aOff = Math.abs(off);
          const push = smooth(0, 3, aOff);
          const x = off * GAP_PX * (1 + push * 0.18);
          const z = -aOff * 230 - push * 120;
          const ry = off * -26 + tx * 6;
          const rx = -ty * 6;
          const scale = 1 - smooth(0, 3.2, aOff) * 0.36;
          const opacity = 1 - smooth(2.0, 3.0, aOff);
          const px = tx * 18 * (1 - aOff * 0.18);
          return {
            transform: `translate3d(${x + px}px, ${
              -ty * 14
            }px, ${z}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${scale})`,
            opacity: Math.max(0, opacity).toFixed(3),
            zIndex: String(1000 - Math.round(aOff * 100)),
            pointerEvents: aOff < 0.5 ? "auto" : "none",
          };
        }
        function circOff(i, p, n) {
          let off = i - p;
          off = ((off % n) + n) % n;
          if (off > n / 2) off -= n;
          return off;
        }

        function Icon({ name }) {
          const paths = ICONS[name]
            .split(" M")
            .map((seg, i) =>
              React.createElement("path", { d: (i ? "M" : "") + seg, key: i })
            );
          if (EXTRA[name]) paths.push(EXTRA[name]);
          return React.createElement(
            "svg",
            {
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 1.7,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            paths
          );
        }

        // volumetric thickness: stacked edge layers behind the glass front
        function VolumetricCard({ s }) {
          const depth = 4;
          const layers = [];
          for (let i = depth; i >= 1; i--) {
            layers.push(
              React.createElement("div", {
                key: "e" + i,
                className: "svc-face edge",
                style: {
                  transform: `translateZ(${-i * 2.2}px)`,
                  filter: `brightness(${0.8 + ((depth - i) / depth) * 0.2})`,
                },
              })
            );
          }
          const front = [
            React.createElement("div", { className: "svc-spec", key: "spec" }),
            React.createElement(
              "div",
              { className: "svc-ic", key: "ic" },
              React.createElement(Icon, { name: s.ic })
            ),
            React.createElement("span", { className: "num", key: "num" }, s.n),
            React.createElement("h3", { key: "h" }, s.t),
            React.createElement("p", { key: "p" }, s.d),
            React.createElement(
              "div",
              { className: "ctags", key: "tg" },
              s.tags.map((t, i) => React.createElement("span", { key: i }, t))
            ),
          ];
          if (s.cta) {
            front.push(
              React.createElement(
                "a",
                {
                  key: "cta",
                  className: "svc-cta",
                  href: s.cta.href,
                  // don't let pressing the button start a carousel drag (was hijacking the click)
                  onMouseDown: (e) => e.stopPropagation(),
                  onTouchStart: (e) => e.stopPropagation(),
                  onClick: (e) => e.stopPropagation(), // let native href navigation proceed
                },
                s.cta.label,
                React.createElement(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  React.createElement("path", { d: "M5 12h14M13 6l6 6-6 6" })
                )
              )
            );
          }
          return React.createElement(
            "div",
            {
              className: "svc-card-inner",
              style: {
                position: "absolute",
                inset: 0,
                transformStyle: "preserve-3d",
              },
            },
            ...layers,
            React.createElement(
              "div",
              { className: "svc-face front" },
              ...front
            )
          );
        }

        function Carousel() {
          const stageRef = useRef(null);
          const cardRefs = useRef([]);
          const dotRefs = useRef([]);
          const activeRef = useRef(0);

          // animated state held in refs (mutated by rAF, never triggers re-render)
          const progress = useRef(0); // continuous index position
          const target = useRef(0); // where we're easing toward
          const autoplay = useRef(true);
          const tilt = useRef({ x: 0, y: 0 }); // current (damped)
          const tiltTo = useRef({ x: 0, y: 0 }); // target from cursor
          const drag = useRef({ on: false, startX: 0, startProg: 0 });
          const N = SERVICES.length;

          useEffect(() => {
            let raf,
              last = performance.now();
            const reduce = window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches;
            // frame-rate-independent exponential smoothing
            const damp = (rate, dt) => 1 - Math.pow(1 - rate, dt);

            const loop = (now) => {
              const dt = Math.min(3, (now - last) / 16.667);
              last = now;

              // continuous autoplay advances the target (gentle, constant)
              if (autoplay.current && !drag.current.on && !reduce)
                target.current += 0.0036 * dt;

              // ease progress toward target (smooth, frame-rate independent)
              progress.current +=
                (target.current - progress.current) * damp(0.14, dt);

              // inertia-damped tilt (lags the cursor)
              tilt.current.x +=
                (tiltTo.current.x - tilt.current.x) * damp(0.08, dt);
              tilt.current.y +=
                (tiltTo.current.y - tilt.current.y) * damp(0.08, dt);

              const p = progress.current;
              const tx = tilt.current.x,
                ty = tilt.current.y;

              for (let i = 0; i < N; i++) {
                const el = cardRefs.current[i];
                if (!el) continue;
                const off = circOff(i, p, N);
                const st = layout(off, tx, ty);
                el.style.transform = st.transform;
                el.style.opacity = st.opacity;
                el.style.zIndex = st.zIndex;
                el.style.pointerEvents = st.pointerEvents;
              }

              // sync active dot via DOM (no React re-render → no per-frame snapping)
              const cur = ((Math.round(p) % N) + N) % N;
              if (cur !== activeRef.current) {
                const prev = dotRefs.current[activeRef.current];
                const next = dotRefs.current[cur];
                if (prev) prev.className = "";
                if (next) next.className = "on";
                activeRef.current = cur;
              }

              raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);

            // pause autoplay when off-screen
            const io = new IntersectionObserver(
              (es) => {
                es.forEach((e) => {
                  autoplay.current = e.isIntersecting;
                });
              },
              { threshold: 0.2 }
            );
            if (stageRef.current) io.observe(stageRef.current);

            return () => {
              cancelAnimationFrame(raf);
              io.disconnect();
            };
          }, []);

          // mouse parallax
          const onMove = (e) => {
            const r = stageRef.current.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            tiltTo.current = { x: nx * 2, y: ny * 2 };
            if (drag.current.on) {
              const dx = e.clientX - drag.current.startX;
              target.current = drag.current.startProg - dx / 300;
            }
          };
          const onLeave = () => {
            tiltTo.current = { x: 0, y: 0 };
            endDrag();
          };
          const startDrag = (e) => {
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            drag.current = { on: true, startX: cx, startProg: target.current };
            autoplay.current = false;
            stageRef.current.classList.add("dragging");
          };
          const onTouchMove = (e) => {
            if (!drag.current.on) return;
            const dx = e.touches[0].clientX - drag.current.startX;
            target.current = drag.current.startProg - dx / 300;
          };
          const endDrag = () => {
            if (!drag.current.on) return;
            drag.current.on = false;
            target.current = Math.round(target.current); // snap to nearest
            autoplay.current = true;
            if (stageRef.current) stageRef.current.classList.remove("dragging");
          };

          const go = (dir) => {
            target.current = Math.round(target.current) + dir;
            autoplay.current = false;
            setTimeout(() => {
              autoplay.current = true;
            }, 2600);
          };
          const goTo = (i) => {
            // pick shortest direction
            let off = i - (((Math.round(target.current) % N) + N) % N);
            if (off > N / 2) off -= N;
            if (off < -N / 2) off += N;
            target.current = Math.round(target.current) + off;
            autoplay.current = false;
            setTimeout(() => {
              autoplay.current = true;
            }, 2600);
          };

          return React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                className: "svc-stage",
                ref: stageRef,
                onMouseMove: onMove,
                onMouseLeave: onLeave,
                onMouseDown: startDrag,
                onMouseUp: endDrag,
                onTouchStart: startDrag,
                onTouchMove: onTouchMove,
                onTouchEnd: endDrag,
              },
              React.createElement(
                "div",
                { className: "scene" },
                SERVICES.map((s, i) =>
                  React.createElement(
                    "div",
                    {
                      key: i,
                      className: "svc-card",
                      ref: (el) => (cardRefs.current[i] = el),
                      style: layout(circOff(i, 0, N), 0, 0), // initial paint before rAF
                    },
                    React.createElement(VolumetricCard, { s })
                  )
                )
              )
            ),
            React.createElement(
              "div",
              { className: "svc-controls" },
              React.createElement(
                "button",
                {
                  className: "svc-btn",
                  "aria-label": "Previous",
                  onClick: () => go(-1),
                },
                React.createElement(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  React.createElement("path", { d: "m15 18-6-6 6-6" })
                )
              ),
              React.createElement(
                "div",
                { className: "svc-dots" },
                SERVICES.map((s, i) =>
                  React.createElement("i", {
                    key: i,
                    className: i === 0 ? "on" : "",
                    ref: (el) => (dotRefs.current[i] = el),
                    onClick: () => goTo(i),
                    "aria-label": s.t,
                  })
                )
              ),
              React.createElement(
                "button",
                {
                  className: "svc-btn",
                  "aria-label": "Next",
                  onClick: () => go(1),
                },
                React.createElement(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  React.createElement("path", { d: "m9 18 6-6-6-6" })
                )
              )
            ),
            React.createElement(
              "div",
              { className: "svc-hint" },
              "Drag · hover · or use the arrows"
            )
          );
        }

        const mount = document.getElementById("svc-carousel-root");
        if (mount)
          ReactDOM.createRoot(mount).render(React.createElement(Carousel));
      })();
