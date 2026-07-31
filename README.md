# CreatorOS

AI platform for short-form content creators: turn a rough idea into a creative brief + production plan via a short Claude conversation, then get matched with a collaborator and a shared workspace.

See `claude.md` for full project context and `docs/CreatorOS_AI_Prompts.md` for the exact AI system prompts.

## Local development

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in real values
npm run dev
```

Runs on `http://localhost:4000`. Verify with `curl http://localhost:4000/health`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in real values
npm run dev
```

Runs on `http://localhost:5173` (Vite default).

Requires Node.js (LTS 20+) and npm installed locally.
