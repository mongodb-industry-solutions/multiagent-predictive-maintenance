export const TALK_TRACK = [
  {
    heading: "Instructions and Talk Track",
    content: [
      {
        heading: "Solution Overview",
        body: "In the manufacturing industry, there's a growing need to make smarter decisions using all available data—but a large portion of valuable information remains hidden in unstructured sources like product reviews, service notes, and customer feedback. This demo showcases how generative AI, combined with the power and scalability of MongoDB Atlas Vector Search, unlocks that data to enhance traditional inventory classification models. By extracting meaningful insights from unstructured content and integrating them into a unified data layer, businesses can enable more accurate multi-criteria inventory strategies with ease and efficiency.",
      },
      {
        heading: "How to Demo",
        body: [
          "Start by pressing 'Run Analysis' to run a basic ABC analysis using only annual dollar usage.",
          "Add more quantitative criteria by toggling options like average unit cost or lead time from the left menu.",
          "Adjust the importance of each criterion by changing the weights above the table columns—make sure they add up to 1.",
          "To include criteria from unstructured data, click the 'Add New Criteria' button on the bottom left.",
          "Describe the new criterion (e.g., 'Customer Satisfaction') and click 'Autofill' to generate its name, definition, and data sources.",
          "Review the generated values and edit them if needed, then click 'Generate' to process the unstructured data and score each item.",
          "Once generated, the new criterion will appear in the left menu under the previous criteria—toggle it on to include it in the analysis.",
          "Click 'Run Analysis' again to update the classification and see how the new criteria impacted the results.",
          "Click on any product row in the table to view its underlying document structure and data details.",
        ],
      },
    ],
  },
  {
    heading: "Behind the Scenes",
    content: [
      {
        heading: "Logical Architecture",
        body: "This demo combines the power of generative AI and MongoDB’s flexible data platform to extract insights from both structured and unstructured data, enabling smarter inventory classification. Here's how it all works under the hood:",
      },
      {
        image: {
          src: "/images/high-level-architecture.svg",
          alt: "Conceptual Architecture",
        },
      },
      {
        heading: " ",
        body: [
          "MongoDB Atlas stores product data, transaction history, criteria metadata, and unstructured content like product reviews.",
          "Vector embeddings for unstructured text are generated and stored directly in MongoDB, enabling fast and accurate semantic search.",
          "MongoDB Atlas Vector Search is used to retrieve relevant review content based on the criteria definitions.",
          "The frontend and agent workflows are built using Next.js to deliver a seamless and responsive user experience.",
          "AWS Bedrock provides generative AI capabilities for creating embeddings and generating new evaluation criteria from natural language.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "Unified Data Model",
        body: "MongoDB brings together structured, unstructured, and metadata into a single document model. This makes it easy to manage complex inventory classification logic without the need for separate systems or data pipelines.",
      },
      {
        heading: "AI-Ready with Native Vector Search",
        body: "MongoDB Atlas Vector Search allows seamless semantic retrieval from unstructured sources like product reviews. It's built directly into the database, removing the need for external vector tools and simplifying GenAI-powered applications.",
      },
      {
        heading: "Scalable and High-Performance",
        body: "Whether you're processing a few hundred or millions of SKUs, MongoDB ensures fast, reliable performance with built-in replication, horizontal scaling, and low-latency access to all types of data.",
      },
      {
        heading: "Simplifies Your Stack",
        body: "MongoDB supports documents, time series, and vector data in one place. This reduces the need for additional databases or services, cutting down on complexity and operational overhead.",
      },
      {
        heading: "Secure by Default",
        body: "With features like encryption at rest and in transit, field-level security, and enterprise access controls, MongoDB provides robust protection for sensitive data used across AI and analytics workflows.",
      },
    ],
  },
];
