# TV Signal Solutions — Contact Form Backend

A minimal Express + Nodemailer server that receives contact-form submissions
from the website and emails them to the owner. Designed for free-tier Render
deployment.

---

## Deploy to Render (one-time setup)

### 1 — Get a Gmail App Password
1. Go to your Google Account → **Security** → **2-Step Verification** (enable if off)
2. Then go to **App Passwords** → generate one for "Mail / Other"
3. Copy the 16-character password (no spaces)

### 2 — Create a new Web Service on Render
1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect this GitHub repo
3. Set **Root Directory** to `server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Select the **Free** plan

### 3 — Add Environment Variables
In the Render dashboard → **Environment**:

| Key | Value |
|-----|-------|
| `GMAIL_USER` | your Gmail address (e.g. `you@gmail.com`) |
| `GMAIL_PASS` | the 16-char App Password from step 1 |
| `TO_EMAIL`   | where leads should land (e.g. `amirmasodgh@icloud.com`) |

### 4 — Copy your Render URL into the website
After the first deploy, Render gives you a URL like:
```
https://tvss-contact.onrender.com
```
Open `js/leads.js` (and `index.html`) and replace the placeholder:
```js
endpoint: 'https://tvss-contact.onrender.com/contact',
```

### 5 — Done!
Submit the contact form on the live site — you should receive an email
within seconds.

---

## Local testing

```bash
cd server
npm install

# create a .env file (never commit this)
echo "GMAIL_USER=you@gmail.com" >> .env
echo "GMAIL_PASS=your_app_password" >> .env
echo "TO_EMAIL=you@icloud.com" >> .env

npm run dev
# server runs on http://localhost:3000
```

Test with curl:
```bash
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Hello!"}'
```
