import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Falta MONGODB_URI en .env.local");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Cache de la conexión Mongo en desarrollo
  // (Next.js hot reload)
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const client = await clientPromise;

  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("Falta MONGODB_DB en .env.local");
  }

  return client.db(dbName);
}
