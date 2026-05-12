# SpendSmart + ShopSmart — Combined App

A unified personal finance app with:
- 💰 **SpendSmart** — Daily expense tracking, budgets, bank statement import, monthly comparison, CSV export
- 🛒 **ShopSmart** — Monthly shopping list, rate tracker, invoice scanner (AI-powered)

---

## 🚀 Hosting on Vercel (Free — Recommended)

### Step 1 — Install Node.js
Download and install from: https://nodejs.org (choose LTS version)

### Step 2 — Install Vercel CLI
Open Terminal (Mac/Linux) or Command Prompt (Windows) and run:
```
npm install -g vercel
```

### Step 3 — Extract this project
Unzip `spendsmart.zip` to a folder, e.g. `C:\Projects\spendsmart` or `~/Projects/spendsmart`

### Step 4 — Install dependencies
```
cd spendsmart
npm install
```

### Step 5 — Test locally first (optional)
```
npm start
```
Open http://localhost:3000 in your browser.

### Step 6 — Deploy to Vercel
```
vercel
```
- It will ask: **Set up and deploy?** → press Y
- **Which scope?** → choose your account
- **Link to existing project?** → N
- **Project name?** → spendsmart (or any name)
- **In which directory is your code?** → ./ (press Enter)
- It will build and give you a URL like: `https://spendsmart-yourname.vercel.app`

That's it! Your app is live. 🎉

---

## 🌐 Alternative: Netlify (Also Free)

### Step 1 — Build the app
```
cd spendsmart
npm install
npm run build
```
This creates a `build/` folder.

### Step 2 — Deploy to Netlify
1. Go to https://netlify.com and sign up (free)
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the `build/` folder onto the page
4. Done! You get a URL like `https://yourapp.netlify.app`

---

## 📱 Add to Phone Home Screen (PWA)

After hosting:
- **Android**: Open the URL in Chrome → tap menu (⋮) → "Add to Home Screen"
- **iPhone**: Open in Safari → tap Share (□↑) → "Add to Home Screen"

It will work like a native app!

---

## 🔑 Important: API Key

This app calls the Anthropic Claude API for:
- Analyzing bank statements (Import tab)
- Scanning invoices (Scan Invoice tab)

The API key is handled by Claude.ai when running in this chat.
When self-hosting, you need to add your own API key.

**To add your API key:**
1. Get a key from https://console.anthropic.com
2. Open `src/sections/ExpenseSection.js` and `src/sections/ShopSection.js`
3. Find the `fetch("https://api.anthropic.com/v1/messages"` calls
4. Add a header: `"x-api-key": "YOUR_API_KEY_HERE"`

Or set up a simple backend proxy (recommended for security).

---

## 📁 Project Structure
```
spendsmart/
├── public/
│   └── index.html
├── src/
│   ├── App.js              ← Main app with bottom navigation
│   ├── index.js            ← React entry point
│   ├── constants.js        ← All data, helpers, seed data
│   ├── components/
│   │   └── Shared.js       ← Reusable UI components
│   └── sections/
│       ├── ExpenseSection.js  ← Full expense tracker
│       └── ShopSection.js     ← Shopping list + rate tracker
└── package.json
```
