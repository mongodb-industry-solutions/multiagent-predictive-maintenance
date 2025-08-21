import { MongoClient, ServerApiVersion } from "mongodb";

let client;
let clientPromise;

function createMongoClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required but not set");
  }
  const uri = process.env.MONGODB_URI;
  const options = {
    appName: "genai-inventory-optimization",
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
  };
  return new MongoClient(uri, options);
}

function getMongoClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = createMongoClient();
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = createMongoClient();
      clientPromise = client.connect();
    }
  }
  return clientPromise;
}

export default getMongoClientPromise;
