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

function monthRangeUTC(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error("month inválido");
  const year = Number(m[1]);
  const mm = Number(m[2]);
  const start = new Date(Date.UTC(year, mm - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mm, 1, 0, 0, 0, 0));
  return { start, end };
}

const accountKey = (raw) => {
  if (raw instanceof ObjectId) return raw.toString();
  if (typeof raw === "string" && raw.trim()) return raw;
  return "__none__";
};

const month = process.argv[2] || "2026-02";
const { start, end } = monthRangeUTC(month);

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  const accounts = await db.collection("accounts").find({ active: { $ne: false } }).project({ name: 1 }).toArray();
  const accountsMap = new Map(accounts.map((a) => [a._id.toString(), a.name ?? "—"]));

  const openingRows = await db.collection("transactions").aggregate([
    { $match: { deletedAt: { $exists: false }, date: { $lt: start } } },
    {
      $group: {
        _id: "$accountId",
        balance: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$type", "income"] }, then: "$amount" },
                { case: { $eq: ["$type", "expense"] }, then: { $multiply: ["$amount", -1] } },
                {
                  case: { $and: [{ $eq: ["$type", "transfer"] }, { $eq: ["$transferSide", "in"] }] },
                  then: "$amount",
                },
                {
                  case: { $and: [{ $eq: ["$type", "transfer"] }, { $eq: ["$transferSide", "out"] }] },
                  then: { $multiply: ["$amount", -1] },
                },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]).toArray();

  const monthRows = await db.collection("transactions").aggregate([
    { $match: { deletedAt: { $exists: false }, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: "$accountId",
        balance: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$type", "income"] }, then: "$amount" },
                { case: { $eq: ["$type", "expense"] }, then: { $multiply: ["$amount", -1] } },
                {
                  case: { $and: [{ $eq: ["$type", "transfer"] }, { $eq: ["$transferSide", "in"] }] },
                  then: "$amount",
                },
                {
                  case: { $and: [{ $eq: ["$type", "transfer"] }, { $eq: ["$transferSide", "out"] }] },
                  then: { $multiply: ["$amount", -1] },
                },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]).toArray();

  const openingMap = new Map(openingRows.map((r) => [accountKey(r._id), Number(r.balance) || 0]));
  const monthMap = new Map(monthRows.map((r) => [accountKey(r._id), Number(r.balance) || 0]));

  const summary = accounts
    .map((a) => {
      const id = a._id.toString();
      return {
        accountId: id,
        accountName: accountsMap.get(id) ?? "—",
        opening: openingMap.get(id) ?? 0,
        monthNet: monthMap.get(id) ?? 0,
        closing: (openingMap.get(id) ?? 0) + (monthMap.get(id) ?? 0),
      };
    })
    .filter((row) => row.opening !== 0 || row.monthNet !== 0)
    .slice(0, 10);

  console.log("Resumen", month, summary);
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.close();
}
