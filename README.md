# Agentic Predictive Maintenance System

This project implements an agentic system for predictive maintenance using LangGraph.js and Next.js. The system uses AWS Bedrock and MongoDB for state management.

## Architecture

The application is built using:

- **Next.js**: Frontend and API routes
- **LangGraph.js**: Agent orchestration framework
- **AWS Bedrock**: LLM provider (Claude models)
- **MongoDB**: Storage and state persistence

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- AWS Account with Bedrock access

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

4. Update the `.env.local` file with your MongoDB and AWS credentials.

5. Run the development server:

```bash
npm run dev
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
