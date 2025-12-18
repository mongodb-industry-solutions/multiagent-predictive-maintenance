import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const database = process.env.DATABASE_NAME;
    if (!database) {
      throw new Error("DATABASE_NAME environment variable is required but not set");
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const client = await getMongoClientPromise();
    const db = client.db(database);
    const shipmentsCollection = db.collection('shipments');

    // Build filter based on query params
    let filter = {};
    if (status) {
      filter.status = status;
    }

    // Fetch shipments from MongoDB
    const shipments = await shipmentsCollection.find(filter).toArray();

    return NextResponse.json(shipments);
    
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments", message: error.message },
      { status: 500 }
    );
  }
}