# LOOM AI

**Your emails, written the way you would write them.**

LOOM AI is an AI-powered email writing assistant that learns from your writing style and helps you compose natural, personalized emails. Built with Next.js, TypeScript, and Tailwind CSS.

![LOOM AI](https://img.shields.io/badge/LOOM-AI-emerald?style=for-the-badge)

## Features

- **Chat Interface** — Multi-turn conversations with persistent message composer, Enter to send, Shift+Enter for new lines
- **Email Draft Display** — Generated emails shown in a polished draft layout with separate subject/body and one-click copy buttons
- **Tone Selection** — Support for Formal, Friendly, Assertive, Apologetic, Concise, and Persuasive tones
- **Conversation Sidebar** — Searchable conversation history with rename, delete, and responsive collapsibility
- **Writing Style Learning** — Provide an example of your writing and the AI mirrors your patterns
- **Persistence** — All conversations saved in localStorage, restored on refresh
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Modular Backend** — Configurable model API endpoint for any OpenAI-compatible or HuggingFace inference provider

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) icons
- [React 19](https://react.dev/)

## Local Setup

### Prerequisites

- Node.js 18+ installed
- npm 9+ installed

### Steps

1. **Clone and install dependencies:**

   ```bash
   cd loom-ai
   npm install
   ```

2. **Create your environment file:**

   ```bash
   cp .env.example .env.local
   ```

3. **Configure your model endpoint** (see [Model Configuration](#model-configuration) below)

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

## Model Configuration

LOOM AI requires a compatible model inference API. Set these in `.env.local`:

```env
MODEL_API_URL=https://your-inference-endpoint.com/v1/chat/completions
MODEL_API_KEY=your-api-key-here
```

### Compatible Providers

The API route supports multiple response formats:

| Provider | Format | Example `MODEL_API_URL` |
|----------|--------|-------------------------|
| **OpenAI / OpenAI-compatible** | `choices[0].message.content` | `https://api.openai.com/v1/chat/completions` |
| **HuggingFace Inference Endpoints** | `generated_text` or `[0].generated_text` | `https://xyz.us-east-1.aws.endpoints.huggingface.cloud` |
| **vLLM / TGI** | OpenAI-compatible | `https://your-server.com/v1/chat/completions` |
| **Ollama** | `message.content` | `http://localhost:11434/v1/chat/completions` |
| **Custom** | `content`, `text`, or `response` | Your custom endpoint |

### Using Your HuggingFace Model

Your fine-tuned model at `huggingface.co/gautamagrawal/loom` is a model repository, not a live API. To use it:

1. **Option A: HuggingFace Inference Endpoints** — Deploy the model as a [HuggingFace Inference Endpoint](https://huggingface.co/docs/inference-endpoints/) and use the endpoint URL.

2. **Option B: vLLM** — Run locally with vLLM:
   ```bash
   pip install vllm
   vllm serve gautamagrawal/loom --port 8000
   ```
   Then set `MODEL_API_URL=http://localhost:8000/v1/chat/completions`

3. **Option C: Ollama** — Convert and run with Ollama for local inference.

### Without a Model Configured

The app will render correctly and show a clear error message ("Model API is not configured") when you try to send a message. The full UI is functional for exploration.

## Vercel Deployment

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/loom-ai.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Next.js — no build settings needed
   - Add environment variables: `MODEL_API_URL` and `MODEL_API_KEY`
   - Click **Deploy**

3. **Environment Variables in Vercel:**
   - Go to your project → Settings → Environment Variables
   - Add `MODEL_API_URL` and `MODEL_API_KEY` with your production values
   - Redeploy after adding variables

## Project Structure

```
loom-ai/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts    # Server-side chat API endpoint
│   │   ├── globals.css           # Tailwind CSS + custom styles
│   │   ├── layout.tsx            # Root layout with metadata
│   │   └── page.tsx              # Main page composing all components
│   ├── components/
│   │   ├── ChatArea.tsx          # Main chat area with messages + composer
│   │   ├── MessageBubble.tsx     # User/assistant/error/email-draft messages
│   │   ├── MessageComposer.tsx   # Auto-resizing message input
│   │   ├── Sidebar.tsx           # Conversation list with search/rename/delete
│   │   └── WelcomeScreen.tsx     # Welcome screen with suggestions
│   ├── hooks/
│   │   ├── useAutoScroll.ts      # Auto-scroll to latest message
│   │   └── useConversations.ts   # Core state management + persistence
│   ├── lib/
│   │   └── storage.ts            # localStorage persistence utilities
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── .env.example                  # Environment variable template
├── eslint.config.mjs             # ESLint configuration
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies and scripts
├── postcss.config.mjs            # PostCSS configuration for Tailwind
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
