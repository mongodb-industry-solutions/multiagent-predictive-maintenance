import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
if (!process.env.DATABASE_NAME) {
  throw new Error('Invalid/Missing environment variable: "DATABASE_NAME"');
}

const uri = process.env.MONGODB_URI;
const database = process.env.DATABASE_NAME;
const options = { appName: "genai-inventory-optimization" };

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  global._mongoClientPromise = clientPromise;
} else {
  clientPromise = global._mongoClientPromise;
}

// export async function vectorSearch(queryEmbedding, collection) {
//   try {
//     const client = await clientPromise;
//     const db = client.db(database);

//     const chunks = await db
//       .collection(collection)
//       .aggregate([
//         {
//           $vectorSearch: {
//             index: "default",
//             path: "emb",
//             queryVector: queryEmbedding,
//             numCandidates: 50,
//             limit: 5,
//           },
//         },
//       ])
//       .toArray();

//     return chunks;
//   } catch (error) {
//     console.error(
//       `Error performing vector search for product ${productId}:`,
//       error
//     );
//     throw error;
//   }
// }

export { clientPromise };
