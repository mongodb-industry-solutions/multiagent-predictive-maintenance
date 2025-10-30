import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const database = process.env.DATABASE_NAME;
    if (!database) {
      throw new Error("DATABASE_NAME environment variable is required but not set");
    }

    const client = await getMongoClientPromise();
    const db = client.db(database);
    const reportsCollection = db.collection('shipment_incident_reports');

    // Fetch incident reports, newest first
    const reports = await reportsCollection
      .find({})
      .sort({ ts: -1 })
      .toArray();

    return NextResponse.json(reports);
    
  } catch (error) {
    console.error("Error fetching incident reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident reports", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const database = process.env.DATABASE_NAME;
    if (!database) {
      throw new Error("DATABASE_NAME environment variable is required but not set");
    }

    const client = await getMongoClientPromise();
    const db = client.db(database);
    const reportsCollection = db.collection('shipment_incident_reports');

    // Delete all incident reports
    const result = await reportsCollection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} incident reports`);

    return NextResponse.json({ 
      message: `Successfully deleted ${result.deletedCount} incident reports`,
      deletedCount: result.deletedCount 
    });
    
  } catch (error) {
    console.error("Error deleting incident reports:", error);
    return NextResponse.json(
      { error: "Failed to delete incident reports", message: error.message },
      { status: 500 }
    );
  }
}