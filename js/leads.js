/* ============================================================
   Lead delivery — shared submit helper
   Uses Web3Forms (web3forms.com) — no backend, no activation.
   Fallback: opens the visitor’s mail client pre-filled.
   ============================================================ */
      (function () {
        window.TVS_CONTACT = {
          email: "tvsignalsolutions.co.nz@gmail.com",
          phone: "0220746441",
          w3fKey: "6b287001-081b-410b-8a83-0603d8c6cc7b",
        };

        function mailtoFallback(data, subject) {
          const body = Object.entries(data)
            .filter(([k]) => !k.startsWith("access_key"))
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          const url =
            "mailto:" +
            window.TVS_CONTACT.email +
            "?subject=" +
            encodeURIComponent(subject || "Website enquiry") +
            "&body=" +
            encodeURIComponent(body);
          window.location.href = url;
        }

        // returns { ok, method:'email'|'mailto' }
        window.submitLead = async function (data, subject) {
          const payload = Object.assign(
            {
              access_key: window.TVS_CONTACT.w3fKey,
              subject: subject || "New enquiry — TV Signal Solutions",
              from_name: "TV Signal Solutions Website",
            },
            data
          );
          try {
            const res = await fetch("https://api.web3forms.com/submit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success) return { ok: true, method: "email" };
            throw new Error(json.message || "Web3Forms error");
          } catch (e) {
            mailtoFallback(data, subject);
            return { ok: true, method: "mailto" };
          }
        };
      })();
