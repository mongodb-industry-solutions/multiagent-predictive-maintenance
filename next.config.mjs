/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    qualities: [75, 100],
  },
  async redirects() {
    return [
      {
        source: "/failure-prediction",
        destination: "/agentic-ai/failure-prediction",
        permanent: true,
      },
      {
        source: "/workorder-generation",
        destination: "/agentic-ai/workorder-generation",
        permanent: true,
      },
      {
        source: "/workorder-scheduler",
        destination: "/agentic-ai/workorder-scheduler",
        permanent: true,
      },
      {
        source: "/agent-sandbox",
        destination: "/agentic-ai/agent-sandbox",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
