/* ============================================================
   Lead delivery — shared submit helper
   Uses a self-hosted Express + Nodemailer backend on Render.
   See server/README.md for deploy instructions.
   Fallback: opens the visitor’s mail client pre-filled.
   ============================================================ */
(function () {
  window.TVS_CONTACT = {
    email: 'amirmasodgh@icloud.com',
    phone: '0220746441',
    // ► Replace with your Render service URL after deploying server/
    endpoint: 'https://YOUR_RENDER_SERVICE.onrender.com/api/contact',
  };

  function mailtoFallback(data, subject) {
    const body = Object.entries(data)
      .filter(([k]) => k !== 'honeypot')
      .map(([k, v]) => `${k}: ${v}`).join('\n');
    const url = 'mailto:' + window.TVS_CONTACT.email
      + '?subject=' + encodeURIComponent(subject || 'Website enquiry')
      + '&body='    + encodeURIComponent(body);
    window.location.href = url;
  }

  // returns { ok, method:'email'|'mailto' }
  window.submitLead = async function (data, subject) {
    try {
      const res = await fetch(window.TVS_CONTACT.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(Object.assign({ honeypot: '' }, data)),
      });
      const json = await res.json();
      if (json.ok) return { ok: true, method: 'email' };
      throw new Error(json.message || 'Server error');
    } catch (e) {
      // network blocked (preview sandbox) or server error → mail client
      mailtoFallback(data, subject);
      return { ok: true, method: 'mailto' };
    }
  };
})();
