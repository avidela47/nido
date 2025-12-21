import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET() {
  try {
    const db = await getDb();

    const people = await db
      .collection("people")
      .find({ active: true })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ ok: true, people });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    const name =
      typeof body === "object" && body !== null && "name" in body
        ? (body as { name?: unknown }).name
        : undefined;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Nombre inválido" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db.collection("people").insertOne({
      name: name.trim(),
      active: true,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString() });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}

