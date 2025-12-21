import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

const SEED = [
  { name: "Sueldo", type: "income" },
  { name: "Ingresos extra", type: "income" },
  { name: "Alimentos", type: "expense" },
  { name: "Servicios", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Salud", type: "expense" },
  { name: "Ocio", type: "expense" },
];

export async function GET(req: Request) {
  try {
    const db = await getDb();

    const url = new URL(req.url);
    const seed = url.searchParams.get("seed");

    if (seed === "true") {
      const count = await db.collection("categories").countDocuments();
      if (count === 0) {
        await db.collection("categories").insertMany(
          SEED.map((c) => ({
            ...c,
            createdAt: new Date(),
          }))
        );
      }
    }

    const categories = await db
      .collection("categories")
      .find({})
      .sort({ type: 1, name: 1 })
      .toArray();

    return NextResponse.json({ ok: true, categories });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
