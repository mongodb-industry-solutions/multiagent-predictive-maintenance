import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { NextResponse } from "next/server";
import { EJSON } from "bson";

export async function POST(req, { params }) {
  try {
    const database = process.env.DATABASE_NAME;
    if (!database) {
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    }

    const { action } = await params;
    const requestText = await req.text();

    // Parse the request body with EJSON to properly handle Date objects and other MongoDB types
    const body = EJSON.parse(requestText);

    const {
      collection,
      filter,
      projection,
      update,
      upsert,
      sort,
      limit,
      pipeline,
      document,
      documents,
      operations,
      options,
    } = body;

    if (
      !collection ||
      (!filter &&
        action !== "aggregate" &&
        action !== "insertOne" &&
        action !== "insertMany" &&
        action !== "bulkWrite" &&
        action !== "replaceOne")
    ) {
      return NextResponse.json(
        { message: "Missing required fields: collection, filter/pipeline" },
        { status: 400 }
      );
    }

    const client = await getMongoClientPromise();
    const db = client.db(database);
    const col = db.collection(collection);

    let result;

    switch (action) {
      case "findOne":
        result = await col.findOne(filter, { projection });
        break;
      case "find":
        const findOptions = {};
        if (projection) findOptions.projection = projection;
        if (sort) findOptions.sort = sort;
        if (limit) findOptions.limit = limit;

        result = await col.find(filter, findOptions).toArray();
        break;
      case "insertOne":
        if (!document) {
          return NextResponse.json(
            { message: "Missing required field: document" },
            { status: 400 }
          );
        }
        result = await col.insertOne(document);
        break;
      case "insertMany":
        if (!documents || !Array.isArray(documents) || documents.length === 0) {
          return NextResponse.json(
            {
              message:
                "Missing or invalid required field: documents (must be a non-empty array)",
            },
            { status: 400 }
          );
        }
        result = await col.insertMany(documents);
        break;
      case "replaceOne":
        if (!document) {
          return NextResponse.json(
            { message: "Missing required field: document" },
            { status: 400 }
          );
        }
        result = await col.replaceOne(filter, document);
        break;
      case "bulkWrite":
        if (
          !operations ||
          !Array.isArray(operations) ||
          operations.length === 0
        ) {
          return NextResponse.json(
            {
              message:
                "Missing or invalid required field: operations (must be a non-empty array)",
            },
            { status: 400 }
          );
        }

        result = await col.bulkWrite(operations, options || {});
        break;
      case "updateOne":
        if (!update) {
          return NextResponse.json(
            { message: "Missing required field: update" },
            { status: 400 }
          );
        }

        result = await col.updateOne(filter, update, {
          upsert: upsert || false,
        });
        break;
      case "updateMany":
        if (!update) {
          return NextResponse.json(
            { message: "Missing required field: update" },
            { status: 400 }
          );
        }
        result = await col.updateMany(filter, update, {
          upsert: upsert || false,
        });
        break;
      case "deleteMany":
        result = await col.deleteMany(filter);
        break;
      case "deleteOne":
        result = await col.deleteOne(filter);
        break;
      case "aggregate":
        if (!pipeline) {
          return NextResponse.json(
            { message: "Missing required field: pipeline" },
            { status: 400 }
          );
        }
        result = await col.aggregate(pipeline).toArray();
        break;
      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error handling request:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
