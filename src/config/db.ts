
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  throw new Error("MongoDB environment variables are missing!");
}

export const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

export const db = client.db(dbName);

export const connectDB = async () => {
  try {
    await client.connect();
    await db.command({ ping: 1 });

    console.log("MongoDB connected successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};
