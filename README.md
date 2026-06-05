# ⚡ Git-Visual — Learn Git Visually. Understand Git Confidently.

> An interactive, full-stack web app that teaches Git branching through visual commit graphs and a hands-on terminal experience.

🔗 **[Live Demo](https://git-visual.onrender.com)** *(First load may take ~30s — free-tier server spinning up)*

![Demo](./assets/demo.gif)

---

## 🖥️ Overview

Most Git tutorials teach you commands. Git Visual teaches you **what those commands actually do.**

Type real Git commands into an interactive terminal, watch your branch graph update live, and follow structured tutorials that guide you from `git init` all the way through merges, rebases, and conflict resolution — all without touching a real codebase.

Built for beginners who feel lost in the command line and developers who want to build a mental model of how Git works under the hood.

---

## ✨ Features

- 🌳 **Live branch graph** — color-coded, interactive visualization of commits and branches that updates as you type
- 🖊️ **Real Git command input** — type actual Git commands (`git branch`, `git merge`, `git rebase`, etc.)
- 🔀 **Branch & merge visualization** — see exactly how branches diverge, merge, and relate to each other
- 🎯 **Tutorial mode** — guided lessons with objectives, hints, and completion tracking
- 💾 **Progress saving** — your session state is persisted so you can pick up where you left off
- 📱 **Responsive** — works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Deployment | Render |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/git-visual.git
cd git-visual

# Install server dependencies
npm install

# Install client dependencies
cd client && npm install
```

### Running Locally

```bash
# Start the backend (from root)
npm run server

# Start the frontend (from /client)
npm run start

# Or run both concurrently from root
npm run dev
```

App runs at `http://localhost:3000`

---

## 📁 Project Structure

```
git-visual/
├── client/                   # React + TypeScript frontend (Vite)
│   ├── public/
│   ├── src/                  # Components, pages, logic
│   ├── index.html
│   ├── vite.config.js
│   ├── tsconfig.json
│   └── package.json
├── server/                   # Node.js / Express backend
│   └── package.json
└── README.md
```

---

## 🧠 Challenges & Learnings

- **Git state simulation** — building a mini Git engine in JavaScript that correctly tracks HEAD, refs, commits, and the DAG entirely client-side
- **Branch graph rendering** — dynamically drawing tree structures with correct positioning across arbitrary branch histories, without a dedicated graph library
- **Full-stack session persistence** — syncing terminal state between client and server while keeping the UX feeling snappy

---

## 🗺️ Roadmap

- [ ] GitHub repository import — visualize your own real repos
- [ ] Merge conflict simulator
- [ ] Rebase & cherry-pick walkthroughs
- [ ] D3.js graph upgrade for more complex histories
- [ ] Multiplayer / collaborative sessions
- [ ] Learning challenges & quizzes

---
