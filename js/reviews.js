/* ============================================================
   Reviews — auto-rotating testimonial
   Cross-fades through the review cards, builds clickable dots,
   pauses on hover/focus. Gracefully handles any number of cards.
   ============================================================ */
      (function () {
        const stage = document.getElementById("rev-cards");
        const dotsWrap = document.getElementById("rev-dots");
        if (!stage || !dotsWrap) return;
        const cards = Array.from(stage.querySelectorAll(".rev-card"));
        if (!cards.length) return;

        let i = cards.findIndex((c) => c.classList.contains("active"));
        if (i < 0) i = 0;
        let timer = null;
        const DELAY = 5200;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        // build dots
        cards.forEach((_, n) => {
          const d = document.createElement("i");
          if (n === i) d.className = "on";
          d.setAttribute("role", "button");
          d.setAttribute("aria-label", "Show review " + (n + 1));
          d.addEventListener("click", () => {
            show(n);
            restart();
          });
          dotsWrap.appendChild(d);
        });
        const dots = Array.from(dotsWrap.children);

        // size the stage to fit the tallest review so nothing ever clips (any width)
        function fitHeight() {
          let max = 0;
          cards.forEach((c) => {
            const vis = c.style.visibility,
              pos = c.style.position,
              op = c.style.opacity;
            c.style.visibility = "hidden";
            c.style.position = "relative";
            c.style.opacity = "0";
            max = Math.max(max, c.offsetHeight);
            c.style.visibility = vis;
            c.style.position = pos;
            c.style.opacity = op;
          });
          stage.style.minHeight = max + "px";
        }
        fitHeight();
        let fitT;
        window.addEventListener("resize", () => {
          clearTimeout(fitT);
          fitT = setTimeout(fitHeight, 180);
        });
        if (document.fonts && document.fonts.ready)
          document.fonts.ready.then(fitHeight);

        // hide dots entirely if there's only one review
        if (cards.length < 2) {
          dotsWrap.style.display = "none";
          return;
        }

        function show(n) {
          cards[i].classList.remove("active");
          if (dots[i]) dots[i].className = "";
          i = (n + cards.length) % cards.length;
          cards[i].classList.add("active");
          if (dots[i]) dots[i].className = "on";
        }
        function next() {
          show(i + 1);
        }
        function start() {
          if (!reduce && !timer) timer = setInterval(next, DELAY);
        }
        function stop() {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
        function restart() {
          stop();
          start();
        }

        const stageEl = stage.closest(".rev-stage");
        stageEl.addEventListener("mouseenter", stop);
        stageEl.addEventListener("mouseleave", start);
        stageEl.addEventListener("focusin", stop);
        stageEl.addEventListener("focusout", start);

        // only auto-rotate while visible
        const io = new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              if (e.isIntersecting) start();
              else stop();
            });
          },
          { threshold: 0.25 }
        );
        io.observe(stageEl);
      })();
