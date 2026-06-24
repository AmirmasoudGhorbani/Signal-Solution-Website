/* ============================================================
   Signal Assistant — live chat
   Uses window.claude.complete to answer questions about TV Signal
   Solutions. Falls back to keyword replies if the API is absent.
   ============================================================ */
      (function () {
        const fab = document.getElementById("chat-fab");
        const panel = document.getElementById("chat-panel");
        const closeBtn = document.getElementById("chat-close");
        const body = document.getElementById("chat-body");
        const input = document.getElementById("chat-input-field");
        const send = document.getElementById("chat-send");
        const suggest = document.getElementById("chat-suggest");
        if (!fab || !panel) return;

        const BIZ = `You are "Signal Assistant", the friendly virtual assistant for TV Signal Solutions — a 100% New Zealand owned and operated family business based in Auckland.
Services: TV antenna & aerial installation and repair (UHF, Freeview, FM), TV repair (screen faults, no power, board-level and software issues), satellite dish & Starlink cabling, fixing TV reception/pixelation and retuning, multi-room TV distribution and TV jacks, 4G/cellular mobile-signal improvement and 4G modem setup, whole-home WiFi & networking optimisation, CCTV & security cameras, smart-home and general IT tech support.
Coverage: all of Auckland — North Shore, West Auckland, Central, East Auckland, Manukau, Papakura, Hibiscus Coast, Waitematā and more.
Details: same-day callouts where possible, workmanship guaranteed, discounted rates for senior citizens, both domestic and commercial. Technicians have worked for leading NZ TV/broadcast and tech companies.
Contact: phone 022 074 6441, email tvsignalsolutions.co.nz@gmail.com.
Rules: Be warm, concise and helpful (2-4 sentences max). You cannot book jobs or give exact prices, but you can explain services and always encourage calling 022 074 6441 or using the quote form for a free quote. If the customer wants to be contacted, book a job, or get a callback, tell them to tap the "Request a callback" button below the chat (or call 022 074 6441). Only answer about this business and home signal/TV/wifi/security topics.`;

        let history = [];
        let busy = false;
        let opened = false;

        function open() {
          panel.classList.add("open");
          fab.style.display = "none";
          if (!opened) {
            opened = true;
            botSay(
              "Kia ora! 👋 I'm the Signal Assistant. Ask me anything about TV aerials, satellite, WiFi, signal issues or our Auckland coverage — or I can help you get a free quote."
            );
          }
          setTimeout(() => input && input.focus(), 350);
        }
        function close() {
          panel.classList.remove("open");
          fab.style.display = "flex";
        }

        fab.addEventListener("click", open);
        closeBtn.addEventListener("click", close);

        function el(cls, txt) {
          const d = document.createElement("div");
          d.className = cls;
          if (txt) d.textContent = txt;
          return d;
        }
        function scroll() {
          body.scrollTop = body.scrollHeight;
        }

        function botSay(t) {
          const m = el("msg bot", t);
          body.appendChild(m);
          scroll();
        }
        function userSay(t) {
          const m = el("msg user", t);
          body.appendChild(m);
          scroll();
        }

        function showTyping() {
          const t = el("typing");
          t.id = "typing";
          t.innerHTML = "<i></i><i></i><i></i>";
          body.appendChild(t);
          scroll();
          return t;
        }
        function hideTyping() {
          const t = document.getElementById("typing");
          if (t) t.remove();
        }

        /* ---- inline "request a callback" lead form ---- */
        let callbackOpen = false;
        function startCallback() {
          if (callbackOpen) return;
          callbackOpen = true;
          if (suggest) suggest.style.display = "none"; // free up space
          botSay(
            "No problem — pop your details below and we'll call you back to sort it out. 👇"
          );
          const form = document.createElement("form");
          form.className = "chat-lead";
          form.innerHTML =
            '<input name="name" placeholder="Your name" autocomplete="name" required>' +
            '<input name="phone" placeholder="Phone number" autocomplete="tel" inputmode="tel" required>' +
            '<input name="email" placeholder="Email (optional)" autocomplete="email" type="email">' +
            '<textarea name="message" placeholder="What do you need help with?" rows="2"></textarea>' +
            '<button type="submit"><span>Request my callback</span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>';
          body.appendChild(form);
          // scroll the form fully into view once laid out
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              body.scrollTop = body.scrollHeight;
            })
          );
          setTimeout(() => {
            const f = form.querySelector("input");
            if (f) f.focus({ preventScroll: true });
            body.scrollTop = body.scrollHeight;
          }, 180);
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const btn = form.querySelector("button");
            const btnLabel = btn.querySelector("span");
            btn.disabled = true;
            if (btnLabel) btnLabel.textContent = "Sending…";
            const data = {
              Name: fd.get("name") || "",
              Phone: fd.get("phone") || "",
              Email: fd.get("email") || "",
              Message: fd.get("message") || "",
              Source: "Live chat — callback request",
            };
            let res = { ok: true, method: "mailto" };
            if (typeof window.submitLead === "function") {
              res = await window.submitLead(
                data,
                "Callback request — TV Signal Solutions"
              );
            }
            form.remove();
            callbackOpen = false;
            if (suggest) suggest.style.display = "";
            botSay(
              res.method === "mailto"
                ? "Thanks " +
                    (data.Name || "there") +
                    "! Your email app should have opened to send those details through — just hit send and we'll be in touch. Or call us now on 022 074 6441."
                : "Thanks " +
                    (data.Name || "there") +
                    "! We've got your details and will call you back shortly. Need us sooner? Call 022 074 6441."
            );
          });
        }

        function fallbackReply(q) {
          const s = q.toLowerCase();
          const call = " Give us a call on 022 074 6441 for a free quote.";
          const cb = " Or tap 'Request a callback' below and we'll get back to you.";

          if (/(price|cost|quote|how much|charge|fee|rate|expensive)/.test(s))
            return (
              "We tailor every job, so prices vary — but quotes are always free with no obligation." +
              call
            );
          if (/(book|appointment|schedule|come out|visit|available|when can)/.test(s))
            return (
              "We offer same-day callouts where possible! Call us on 022 074 6441 and we'll find a time that suits you." +
              cb
            );
          if (/(call.*back|contact.*me|get.*back|ring.*me|phone.*me|reach.*me)/.test(s))
            return "No worries — tap the 'Request a callback' button below and we'll give you a ring back shortly. Or call us directly on 022 074 6441.";
          if (/(tv.*repair|repair.*tv|tv.*fix|fix.*tv|tv.*broken|broken.*tv|screen.*issue|no.*power|won't turn on|not turning on|black screen|dead tv)/.test(s))
            return (
              "We diagnose and repair TVs on-site — from backlight and board-level faults to software glitches. We'll get you back to watching in no time!" +
              call
            );
          if (/(satellite|starlink|dish)/.test(s))
            return (
              "Yes — we install and repair satellite dishes, satellite TV systems and Starlink cabling right across Auckland." +
              call
            );
          if (/(antenna|aerial|uhf|freeview|fm)/.test(s))
            return (
              "We install, repair and upgrade UHF aerials, Freeview and FM antennas, including multi-room setups." +
              call
            );
          if (/(multi.*room|extra.*tv|another.*room|tv.*point|tv.*jack|second.*tv)/.test(s))
            return (
              "Absolutely — we set up multi-room TV distribution and install additional TV points so you can watch in any room." +
              call
            );
          if (/(wifi|wi-fi|internet|network|modem|router|mesh|dead.*spot|dead.*zone|slow.*internet|buffering)/.test(s))
            return (
              "We design, install and optimise whole-home WiFi and mesh networks — no more dead spots or buffering." +
              call
            );
          if (/(4g|cell|mobile.*signal|poor.*signal|no.*signal|rural)/.test(s))
            return (
              "Patchy mobile coverage? We boost your cellular signal and set up 4G modems for dependable connection, even in rural areas." +
              call
            );
          if (/(signal|reception|pixel|tuning|tune|fuzzy|dropout|freezing|glitch|channel.*miss|lost.*channel)/.test(s))
            return (
              "Poor reception, pixelation and tuning faults are our bread and butter — we diagnose on-site and optimise your signal so every channel comes through sharp." +
              call
            );
          if (/(cctv|camera|security|surveillance)/.test(s))
            return (
              "We install professional CCTV and security camera systems for homes and businesses, with remote viewing setup included." +
              call
            );
          if (/(smart.*home|smart.*tv|alexa|google.*home|automation)/.test(s))
            return (
              "We set up and troubleshoot smart-home devices — smart TVs, voice assistants, automated lighting, you name it." +
              call
            );
          if (/(it.*support|computer|tech.*support|help.*with.*device|laptop|printer)/.test(s))
            return (
              "We offer friendly, no-jargon IT and tech support for all your connected devices — at home or at your business." +
              call
            );
          if (/(wall.*mount|mount.*tv|hang.*tv|bracket)/.test(s))
            return (
              "Yes, we can wall-mount your TV with tidy cabling and make sure everything's connected and working perfectly." +
              call
            );
          if (/(area|cover|auckland|where|location|suburb|north.*shore|west|east|central|manukau|papakura|hibiscus)/.test(s))
            return "We cover all of Auckland — North Shore, West Auckland, Central, East Auckland, Manukau, Papakura, Hibiscus Coast, Waitematā and more. Same-day service where possible!";
          if (/(commercial|business|office|shop|retail|warehouse)/.test(s))
            return (
              "We work with businesses too — commercial TV, CCTV, networking, WiFi and IT support for offices, shops and warehouses." +
              call
            );
          if (/(senior|discount|elderly|pension|vet)/.test(s))
            return (
              "Yes! We proudly offer discounted rates for senior citizens." +
              call
            );
          if (/(guarantee|warranty|come.*back|workmanship)/.test(s))
            return (
              "All our work comes with a workmanship guarantee. If something's not right, we'll come back and sort it out — no stress." +
              call
            );
          if (/(same.*day|urgent|emergency|asap|today|how.*quick|how.*fast|how.*soon)/.test(s))
            return (
              "We offer same-day callouts where possible — give us a ring on 022 074 6441 and we'll do our best to get to you today." +
              cb
            );
          if (/(experience|qualified|how.*long|who.*are|about|trained|background)/.test(s))
            return "We're a 100% NZ owned and operated family business. Our technicians have worked for leading NZ TV, broadcast and tech companies — so you're in experienced hands.";
          if (/(pay|payment|cash|card|eftpos|bank.*transfer|invoice)/.test(s))
            return (
              "We accept various payment methods to make things easy. Just ask your technician on the day, or call us to confirm." +
              call
            );
          if (/(hour|open|close|week|sunday|saturday|monday|time)/.test(s))
            return (
              "We're available Monday to Saturday and do our best to work around your schedule. Give us a call on 022 074 6441 to arrange a time." +
              cb
            );
          if (/(phone|number|email|contact|get.*in.*touch)/.test(s))
            return "You can reach us on 022 074 6441 or email tvsignalsolutions.co.nz@gmail.com. We'd love to hear from you!";
          if (/(thank|cheers|ta|awesome|perfect|great|sweet)/.test(s))
            return "You're welcome! If you need anything else, just ask — or call us on 022 074 6441. Have a great day! 😊";
          if (/(bye|goodbye|see.*ya|catch.*you|that's.*all)/.test(s))
            return "Thanks for chatting! Call us anytime on 022 074 6441 or use the quote form above. Take care! 👋";
          if (/(hi|hello|kia ora|hey|g'day|good morning|good afternoon|good evening|sup)/.test(s))
            return "Kia ora! 👋 How can I help with your TV, signal or WiFi today?";
          if (/(what.*do|what.*service|what.*offer|help.*with)/.test(s))
            return (
              "We cover everything signal and connectivity — TV aerials, TV repair, satellite & Starlink, reception fixes, WiFi & networking, 4G signal boost, CCTV & security, smart home and IT support." +
              call
            );
          return (
            "Happy to help with TV aerials, TV repair, satellite, reception, WiFi, CCTV or IT support." +
            call +
            cb
          );
        }

        async function ask(q) {
          if (busy || !q.trim()) return;
          busy = true;
          send.disabled = true;
          userSay(q);
          history.push({ role: "Customer", text: q });
          const typing = showTyping();

          let reply = null;
          try {
            if (window.claude && typeof window.claude.complete === "function") {
              const convo = history
                .map((h) => `${h.role}: ${h.text}`)
                .join("\n");
              const prompt = `${BIZ}\n\nConversation so far:\n${convo}\nAssistant:`;
              reply = await window.claude.complete(prompt);
              if (reply) reply = reply.trim().replace(/^Assistant:\s*/i, "");
            }
          } catch (e) {
            reply = null;
          }

          if (!reply) reply = fallbackReply(q);
          hideTyping();
          botSay(reply);
          history.push({ role: "Assistant", text: reply });
          busy = false;
          send.disabled = false;
          input.focus();
        }

        send.addEventListener("click", () => {
          const v = input.value;
          input.value = "";
          ask(v);
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const v = input.value;
            input.value = "";
            ask(v);
          }
        });

        if (suggest)
          suggest.querySelectorAll("button").forEach((b) => {
            b.addEventListener("click", () => {
              if (b.dataset.action === "callback") {
                startCallback();
                return;
              }
              ask(b.textContent);
            });
          });
      })();
