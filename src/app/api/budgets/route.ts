import { NextResponse } from "next/server";
import { currentMonthYYYYMM, getMonthlyBudgets, upsertBudget } from "../../../lib/budgets";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? currentMonthYYYYMM();

    const data = await getMonthlyBudgets(month);
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }

    const b = body as { month?: unknown; categoryId?: unknown; amount?: unknown };

    if (typeof b.month !== "string") {
      return NextResponse.json({ ok: false, error: "month inválido" }, { status: 400 });
    }
    if (typeof b.categoryId !== "string") {
      return NextResponse.json({ ok: false, error: "categoryId inválido" }, { status: 400 });
    }

    const amount = typeof b.amount === "number" ? b.amount : Number(b.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "amount inválido" }, { status: 400 });
    }

    await upsertBudget({ month: b.month, categoryId: b.categoryId, amount });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(err) }, { status: 400 });
  }
}
