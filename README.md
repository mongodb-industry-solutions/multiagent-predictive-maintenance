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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
