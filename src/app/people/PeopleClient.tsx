"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  _id: string;
  name: string;
};

export default function PeopleClient({ initialPeople }: { initialPeople: Person[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function addPerson() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    setLoading(false);
    setName("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la persona"
          className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={addPerson}
          disabled={loading}
          className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white"
        >
          Agregar
        </button>
      </div>

      <div className="space-y-2">
        {initialPeople.map((p) => (
          <div
            key={p._id}
            className="rounded-2xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm font-semibold"
          >
            {p.name}
          </div>
        ))}

        {initialPeople.length === 0 && (
          <div className="text-sm text-[rgb(var(--subtext))]">
            No hay personas cargadas.
          </div>
        )}
      </div>
    </div>
  );
}
