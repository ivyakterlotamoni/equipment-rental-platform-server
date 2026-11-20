
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";

// Load environment variables
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  throw new Error("MongoDB environment variables are missing!");
}

const client = new MongoClient(uri);

let db: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    await client.connect();

    db = client.db(dbName);

    console.log("MongoDB connected successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};
