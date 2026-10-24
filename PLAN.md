# PrepMate: Local-Only Migration Plan

Goal: run PrepMate fully on localhost. Remove Vercel, Render, Firebase and EmailJS, and replace the Gemini API with local Gemma 4 served by Ollama.

## Decisions

| Topic | Decision |
|---|---|
| AI model | Ollama + `gemma4:e2b` (already installed). The model is set with `OLLAMA_MODEL`. |
| Auth | One seeded demo user, logging in with email and password. No signup, Google sign-in, email verification or password reset. |
| Database | SQLite file at `data/prepmate.db`, starting with no existing data. |
| Backend | Express (`server/`) serving the auth, data and AI endpoints. |
| Speech | Keep Chrome Web Speech API for speech-to-text and `speechSynthesis` for text-to-speech. |
| Offline | Not required. Google Fonts stays. |
| Resume input | Upload a PDF, with text extracted in the browser via `pdfjs-dist`, or paste text. Both fill the same textarea. |
| EmailJS | Removed. Ratings are saved to the local DB only. |
| Run modes | `npm run dev` runs Vite and Express together. `npm start` serves the built app from Express on one port. |
| Repo | `https://github.com/rahultapase/Prep-mate`, currently empty. |

## Target architecture

```
Browser (Vite :5173 in dev)
   │  /api/*  (Vite proxy, same-origin cookie)
   ▼
Express :3001  (server/)
   ├── auth      → SQLite users + sessions (bcryptjs, httpOnly cookie)
   ├── data      → SQLite profiles, interviews, ratings
   └── ai        → Ollama http://127.0.0.1:11434/api/chat (gemma4:e2b)
```

`npm start` builds the frontend into `dist/`, and Express serves it at `http://localhost:3001`.

### SQLite schema

- `users`: `id`, `email` (unique), `password_hash`, `display_name`, `created_at`
- `sessions`: `token` (random 32 bytes, hex), `user_id`, `expires_at`
- `profiles`: `user_id` (PK), `full_name`, `graduation`, `year`, `branch`, `experience`, `role`, `updated_at`
- `interviews`: `id`, `user_id`, `interview_type`, `feedback` (JSON), `questions` (JSON), `answers` (JSON), `user_inputs` (JSON), `created_at`
- `ratings`: `id`, `user_id`, `interview_experience`, `ai_question_quality`, `user_interface`, `overall_satisfaction`, `experience_text`, `created_at`

### API

| Method | Path | Replaces |
|---|---|---|
| POST | `/api/auth/login` | `signInWithEmailAndPassword` |
| POST | `/api/auth/logout` | `signOut` |
| GET | `/api/auth/me` | `onAuthStateChanged`. Returns `{ uid, email, displayName }`. |
| GET / PUT | `/api/profile` | `users/{uid}` getDoc / setDoc |
| GET | `/api/interviews` | Dashboard's full-collection fetch. Now returns only the current user's interviews, newest first. |
| GET | `/api/interviews/count?type=` | `getCompletedSessionsCount` |
| POST | `/api/interviews` | `addDoc(interviewFeedbacks)` |
| DELETE | `/api/interviews/:id` | `deleteDoc`, limited to the owner's interviews |
| POST | `/api/ratings` | `addDoc(userFeedback)` |
| POST | `/api/ai/generate` | `/api/gemini`. Takes `{ prompt, json?, schema? }` and returns `{ text }`. |
| GET | `/api/health` | Server health plus Ollama reachability and whether the model is installed |

Every endpoint except `login` and `health` requires a valid session cookie.

---

## Phase 0: Prep

- `git init`, default branch `main`, then `git remote add origin https://github.com/rahultapase/Prep-mate.git`.
- Add `data/` and `*.db` to `.gitignore`.
- Check Ollama by running `ollama serve` (if it isn't running) and then `ollama run gemma4:e2b "hi"`.
- Replace `.env` with the new variables only, and add `.env.example`:
  - `PORT=3001`
  - `HOST=127.0.0.1`
  - `OLLAMA_URL=http://127.0.0.1:11434`
  - `OLLAMA_MODEL=gemma4:e2b`
  - `OLLAMA_NUM_CTX=16384`
  - `OLLAMA_TIMEOUT_MS=180000`
  - `DEMO_EMAIL=demo@prepmate.local`
  - `DEMO_PASSWORD=demo1234`
  - `DEMO_NAME=Demo User`

Done when: Gemma 4 answers in the terminal, and `.env` no longer contains any Firebase or Gemini keys.

## Phase 1: Remove deployment files and dead code

- Delete these files and folders:
  - `vercel.json`, `.vercelignore`, `api/`, `render.yaml`
  - `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`
  - `public/security-headers.json`, `dist/`
- Delete unused source files:
  - `src/components/Signup.tsx`, `ContactSection.tsx`, `InterviewCard.tsx`
  - `src/utils/emailTemplates.ts`, `src/utils/security.ts`
- Remove unused packages: `@emailjs/browser`, `html2canvas`, `jspdf`, `node-fetch`, `supertokens-auth-react`, `supertokens-node`, `three`, `express-rate-limit`. The `firebase` package stays until Phase 5.
- Move `pdfjs-dist` from devDependencies to dependencies and pin its version. It is needed for PDF resume upload in Phase 6.5.
- `package.json`:
  - Rename the package to `prepmate`.
  - Remove the `dev:serverless`, `deploy` and `build:prod` scripts.
  - Pin `autoprefixer` and `postcss`, which are currently `latest`.
- `vite.config.ts`: remove the COOP/COEP headers and the `utils` manualChunk (html2canvas/jspdf). Keep the `/api` proxy.
- Remove the `/signup` route from `App.tsx`. Point the landing page buttons (`Header`, `HeroSection`, `HowItWorksSection`) to `/login`.
- Replace the `grainy-gradients.vercel.app/noise.svg` background in `Livesession.tsx` with a local `public/noise.svg`.

Done when: `npm install`, `npx tsc --noEmit` and `npm run build` all pass.

> **CHECKPOINT 1:** I stop here and wait. Suggested commit: `chore: remove deploy and dead code`

## Phase 2: Local backend (SQLite + auth + data)

- Move `server.js` to `server/index.js`, split into `server/db.js`, `server/auth.js`, `server/routes/{auth,profile,interviews,ratings}.js`.
- Add pinned packages: `better-sqlite3`, `bcryptjs` and `cookie-parser`. If the `better-sqlite3` native install fails on Windows, use the built-in `node:sqlite` instead.
- Create the schema on startup, and add the demo user from `.env` if it doesn't already exist.
- Sessions:
  - The cookie is httpOnly, `SameSite=Lax`, and lasts 7 days.
  - Tokens are stored in the `sessions` table.
  - Logout deletes the session row.
- Express setup:
  - Bind to `127.0.0.1` by default.
  - Remove the Gemini, Firebase and HSTS entries from the CSP and security headers.
  - Restrict CORS to `http://localhost:5173`.
- Validate inputs. Use parameterized queries only. Interview reads and deletes are always limited to `user_id`.

Done when: login, `me`, the profile round trip, and creating, listing, counting and deleting interviews all work through `Invoke-RestMethod` with a session.

## Phase 3: Gemma 4 AI endpoint

- `server/ollama.js` calls `POST {OLLAMA_URL}/api/chat` with:
  - `stream: false`
  - `think: false`
  - `options.num_ctx` set from `.env`
  - a timeout via `AbortController`
- When the request asks for `json: true`, pass Ollama `format` set to the JSON schema it sends, or `"json"` if there's no schema. Feedback output then comes back as valid JSON.
- `POST /api/ai/generate` returns `{ text }`. It responds 503 with a clear message if Ollama is down or the model isn't installed.
- Raise the prompt limit from 10k to 40k characters. A Technical prompt can already exceed 10k, since the resume can be up to 10k and the job description up to 8k.
- `/api/health` reports `{ ollama: true/false, model, modelInstalled }` using `GET /api/tags`.
- Delete the old `/api/gemini` code.

Done when: `/api/ai/generate` returns questions for a sample prompt, and valid feedback JSON for a sample Q/A pair.

> **CHECKPOINT 2:** I stop here and wait. Suggested commit: `feat: add local backend and gemma`

## Phase 4: Frontend auth

- Replace the Firebase-based `useAuth` with an `AuthProvider` context (`src/context/AuthContext.tsx`). It calls `/api/auth/me` once and exposes `{ user, loading, error, login, logout }`. Keep the `useAuth()` name so the existing components need minimal changes.
- `src/config/api.ts`: always use relative `/api/...` paths, and send all requests with `credentials: 'include'` through a small `apiFetch` helper.
- `Login.tsx`:
  - Remove the Google button, the resend verification option, the forgot password flow, and the "Sign Up" link.
  - Show a hint with the demo credentials.
- `Header`: remove the signup handler and link to Login only.

Done when: the demo user can log in and out, and protected routes redirect correctly.

## Phase 5: Frontend data (remove Firestore)

- `Home.tsx` and `Dashboard.tsx`: load and save the profile through `/api/profile`. This also fixes the bug where the profile save overwrites the whole document.
- `Dashboard.tsx`: load interview history from `/api/interviews` and delete through `DELETE /api/interviews/:id`. Remove the client-side email filtering and the debug logs.
- `Livesession.tsx`: get the session count from `/api/interviews/count`, and save interviews with `POST /api/interviews`.
- `Feedback.tsx`: submit ratings to `POST /api/ratings`. Remove EmailJS.
- Stop using `sessionStorage.userEmail` for identity. The server now determines the user from the session.
- Delete `src/firebase.ts`, uninstall `firebase`, and clean up `src/vite-env.d.ts`.

Done when: a search for `firebase` in `src/` returns nothing, and the build passes.

## Phase 6: Frontend AI (Gemma 4)

- Add `src/services/ai.ts` with `generateText(prompt)` and `generateJson(prompt, schema)`, both calling `/api/ai/generate`.
- `Livesession.tsx`:
  - Switch the three calls (questions, follow-up questions, feedback) to the new service.
  - Remove `apiKey` state, both API-key effects, the `userApiKey` field and the `model: 'gemini-2.5-flash'` argument.
  - Generate questions on mount, without waiting for an API key.
  - Send the HR/Behavioral or Technical JSON schema with the feedback request. Keep the existing regex as a parsing fallback.
- `InterviewSystemCheck.tsx`: replace the Gemini key step with a call to `/api/health`. If Ollama is down or the model isn't installed, show "Ollama not running / model missing" and block the Start button.
- If e2b's output breaks question parsing, adjust the prompts slightly. For example, require one question per line, no numbering, each ending with "?". Keep the prompts' meaning the same.
- Increase the loading text and timeouts on the frontend, since local generation can take longer.

Done when: a full interview generates questions, accepts spoken answers, produces feedback, and that feedback appears on the Dashboard.

## Phase 6.5: PDF resume upload (in the browser)

- Add `src/utils/pdfResume.ts` with `extractPdfText(file): Promise<string>`.
  - Uses `pdfjs-dist`. The worker loads through Vite's `?url` import so it works offline.
  - Joins the text from every page and normalizes whitespace.
- `Interview.tsx`, resume field in step 2:
  - Add an accessible "Upload PDF" button: a labelled file input with `accept="application/pdf"` and keyboard support.
  - Show the file name, a loading state and errors.
  - The extracted text fills the `resumeText` textarea. The user can still edit it, or paste text instead of uploading.
- Validation:
  - Only `.pdf` / `application/pdf` files up to 5 MB.
  - If the PDF has no extractable text (a scan), show: "This PDF has no selectable text, please paste your resume."
  - If the text is over 10,000 characters, trim it and show a warning.
  - The existing textarea sanitization still runs on the extracted text.
- The PDF is processed only in the browser. Nothing is uploaded, and the Gemma prompt is the same as for pasted text.

Done when:
- A text-based PDF fills the textarea.
- A scanned PDF shows the paste message.
- A non-PDF or a file over 5 MB is rejected.
- The interview flow works end to end with the uploaded resume.

> **CHECKPOINT 3:** I stop here and wait. Suggested commit: `feat: migrate frontend to local api`

## Phase 7: Run modes, docs, end-to-end check

- Scripts:
  - `dev`: `concurrently "node --watch server/index.js" "vite"`
  - `build`: `vite build`
  - `start`: `vite build && node server/index.js`. Express serves `dist/` with an SPA fallback. This uses Express 5 path syntax.
  - `lint`, `typecheck` (`tsc --noEmit`)
- On startup, the server logs the URL, the database path, and the Ollama status.
- Rewrite `README.md` to cover:
  - prerequisites: Node 22, Ollama, `ollama pull gemma4:e2b`
  - copying `.env.example` to `.env`
  - `npm install`, `npm run dev`, `npm start`
  - the demo login
  - Chrome being required for speech-to-text
- End-to-end test in Chrome:
  1. Log in with the demo user.
  2. Save the profile.
  3. Fill in the interview form, including uploading a PDF resume.
  4. Pass the system check.
  5. Run the live session.
  6. Generate more questions.
  7. End the session to get feedback.
  8. Submit a rating.
  9. Check the Dashboard history, the details modal and delete.
  10. Log out.
- Run `npm run lint`, `npm run typecheck` and `npm run build`.

Done when: every step of the end-to-end flow works with Ollama as the only service besides the app itself.

> **CHECKPOINT 4:** I stop here and wait. Suggested commit: `docs: local setup and run modes`. When you confirm, I push to `origin main`.

---

## Notes

- **Security scope:** This is built for localhost only. The server binds to `127.0.0.1`, has one demo account, stores passwords as bcrypt hashes and uses httpOnly cookies. It is not production-ready for a public network.
- **Gemini key:** The old Gemini key was bundled into the client in the past. Consider revoking it in Google AI Studio.
- **Unchanged files:** `PROJECT_DETAILS.md`, `WORKFLOW.md`, `SEO.md` and `.agents/` are already gitignored and stay as they are.
- **Commits:** Commit messages are short, one line. I commit only when you tell me to at each checkpoint.
