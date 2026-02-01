import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

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

const toKey = (raw) => {
  if (raw instanceof ObjectId) return raw.toString();
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "__none__";
};

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  const accounts = await db.collection("accounts").find({}).project({ _id: 1, name: 1 }).toArray();
  const accountMap = new Map(accounts.map((a) => [a._id.toString(), a.name ?? "—"]));

  const txAccounts = await db.collection("transactions").aggregate([
    { $match: { accountId: { $ne: null } } },
    { $group: { _id: "$accountId", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();

  const unknown = txAccounts
    .map((r) => ({ key: toKey(r._id), n: r.n }))
    .filter((r) => r.key !== "__none__" && !accountMap.has(r.key))
    .slice(0, 20);

  console.log("Total cuentas en DB:", accounts.length);
  console.log("Total accountIds en transactions:", txAccounts.length);
  console.log("accountIds desconocidos (muestra):", unknown);
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.close();
}
