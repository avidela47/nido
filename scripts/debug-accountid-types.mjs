import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  console.error("Faltan MONGODB_URI o MONGODB_DB en .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const types = await db.collection("transactions").aggregate([
    { $group: { _id: { t: { $type: "$accountId" } }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();
  const sampleObj = await db.collection("transactions")
    .find({ accountId: { $type: "object" } })
    .project({ accountId: 1 })
    .limit(3)
    .toArray();
  console.log("accountId types", types);
  console.log("sample object accountId", sampleObj);
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.close();
}
