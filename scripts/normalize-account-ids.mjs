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
    if (!process.env[key]) process.env[key] = value;
  }
}

const envPath = path.join(process.cwd(), ".env.local");
loadEnvFile(envPath);

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

  const accounts = await db.collection("accounts").find({}).project({ _id: 1 }).toArray();
  const accountIds = accounts
    .map((a) => (a._id instanceof ObjectId ? a._id.toString() : String(a._id)))
    .filter((id) => ObjectId.isValid(id));

  let totalMatched = 0;
  let totalModified = 0;

  for (const idStr of accountIds) {
    const res = await db.collection("transactions").updateMany(
      { accountId: idStr },
      { $set: { accountId: new ObjectId(idStr) } }
    );
    totalMatched += res.matchedCount;
    totalModified += res.modifiedCount;
  }

  console.log(
    `Normalización accountId: ${totalMatched} encontrados, ${totalModified} actualizados.`
  );
} catch (err) {
  console.error("Error normalizando accountId:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.close();
}
