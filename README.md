# Agentic Predictive Maintenance System

This project implements an agentic system for predictive maintenance using MongoDB, AWS Bedrock, LangGraph.js and Next.js.

## Architecture

![High Level Architecture](public/img/high-level-architecture.svg)

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

4. Add the following environment variables to your `.env.local` file and update the values as needed:

```env
MONGODB_URI="<your-mongodb-uri>"
DATABASE_NAME="agentic_predictive_maintenance"
AWS_REGION="us-east-1"
AWS_PROFILE="default"
COMPLETION_MODEL="us.anthropic.claude-3-5-haiku-20241022-v1:0"
EMBEDDING_MODEL="cohere.embed-english-v3"
```

5. Update the `.env.local` file with your MongoDB and AWS credentials.

6. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
