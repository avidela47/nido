"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "../../components/ui/Toast";
import { SectionCard } from "../../components/ui/SectionCard";

export default function PagosClient() {
  const { push } = useToast();
  // Estados para el formulario
  const [persona, setPersona] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("");

  // Estados para datos reales
  const [personasData, setPersonasData] = useState<{ _id: string; name: string }[]>([]);
  const [cuentasData, setCuentasData] = useState<{ _id: string; name: string; person?: { _id: string } | null }[]>([]);
  const [categoriasData, setCategoriasData] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  type Pago = {
    _id?: string;
    date?: string;
    person?: { id: string; name: string };
    account?: { id: string; name: string } | null;
    category?: { id: string; name: string };
    amount: number;
    type: string;
  };
  const [pagos, setPagos] = useState<Pago[]>([]);
  // DEBUG: Mostrar estructura real de los pagos en consola
  useEffect(() => {
    if (pagos && pagos.length > 0) {
      console.log("PAGOS DATA", pagos);
    }
  }, [pagos]);
  const [filtroPersona, setFiltroPersona] = useState<string>("");

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [peopleRes, accountsRes, categoriesRes, pagosRes] = await Promise.all([
          fetch("/api/people").then(r => r.json()),
          fetch("/api/accounts").then(r => r.json()),
          fetch("/api/categories").then(r => r.json()),
          fetch("/api/transactions?month=").then(r => r.json()),
        ]);
        if (!ignore) {
          if (peopleRes.ok) setPersonasData(peopleRes.people);
          if (accountsRes.ok) setCuentasData(accountsRes.accounts);
          if (categoriesRes.ok) setCategoriasData((categoriesRes.categories as { _id: string; name: string; type: string }[]).filter((c) => c.type === "expense"));
          if (pagosRes.ok && pagosRes.items) setPagos((pagosRes.items as Pago[]).filter((p) => p.type === "expense"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persona || !cuenta || !importe || !categoria) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          personId: persona,
          accountId: cuenta,
          amount: Number(importe),
          categoryId: categoria,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        push({ title: "Pago registrado", description: "El gasto fue registrado correctamente.", variant: "ok" });
        setImporte("");
        setCategoria("");
        setCuenta("");
        setPersona("");
        // Refrescar lista de pagos
  const pagosRes = await fetch("/api/transactions?month=").then(r => r.json());
  if (pagosRes.ok && pagosRes.items) setPagos((pagosRes.items as Pago[]).filter((p) => p.type === "expense"));
      } else {
        push({ title: "Error al registrar", description: data.error || "Ocurrió un error", variant: "error" });
      }
    } catch {
      push({ title: "Error de red", description: "No se pudo conectar con el servidor", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Filtro y total
  const pagosFiltrados = useMemo(() => {
    if (!filtroPersona) return pagos;
    return pagos.filter(p => {
      // Soportar todas las variantes posibles de persona y cuenta sin usar 'any'
      let personId: string | undefined = undefined;
      if (p.person && typeof p.person === "object") {
        if ('id' in p.person && typeof p.person.id === 'string') personId = p.person.id;
        else if ('_id' in p.person && typeof (p.person as { _id?: string })._id === 'string') personId = (p.person as { _id: string })._id;
      } else if (typeof p.person === "string") {
        personId = p.person;
      }
      let accountPersonId: string | undefined = undefined;
      if (p.account && typeof p.account === "object" && 'person' in p.account && p.account.person) {
        const accPerson = p.account.person;
        if (accPerson && typeof accPerson === "object") {
          if ('id' in accPerson && typeof accPerson.id === 'string') accountPersonId = accPerson.id;
          else if ('_id' in accPerson && typeof (accPerson as { _id?: string })._id === 'string') accountPersonId = (accPerson as { _id: string })._id;
        } else if (typeof accPerson === "string") {
          accountPersonId = accPerson;
        }
      }
      return personId === filtroPersona || accountPersonId === filtroPersona;
    });
  }, [pagos, filtroPersona]);
  const totalPagos = pagosFiltrados.reduce((acc, p) => acc + (typeof p.amount === "number" ? p.amount : Number(p.amount)), 0);

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <SectionCard title="Pagos / Gastos" subtitle="Registrá un gasto realizado por una persona.">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[rgb(var(--subtext))] mb-1">Persona</label>
            <select
              value={persona}
              onChange={e => setPersona(e.target.value)}
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {personasData.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[rgb(var(--subtext))] mb-1">Cuenta</label>
            <select
              value={cuenta}
              onChange={e => setCuenta(e.target.value)}
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
              disabled={!persona}
            >
              <option value="">Seleccionar...</option>
              {cuentasData
                .filter(c => !persona || (c.person && c.person._id === persona))
                .map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[rgb(var(--subtext))] mb-1">Importe</label>
            <input
              type="number"
              value={importe}
              onChange={e => setImporte(e.target.value)}
              placeholder="Ej: 5000"
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[rgb(var(--subtext))] mb-1">Categoría</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {categoriasData.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-linear-to-r from-[rgb(var(--brand))] to-[rgb(var(--brand-2))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 w-full md:w-auto mt-4 md:mt-0"
            disabled={!persona || !cuenta || !importe || !categoria || loading}
          >{loading ? "Cargando..." : "Registrar pago"}</button>
        </form>
      </SectionCard>

      <div className="mt-8">
        <SectionCard title="Pagos realizados">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <label className="text-sm font-medium text-[rgb(var(--subtext))]">Filtrar por persona:</label>
            <select
              value={filtroPersona}
              onChange={e => setFiltroPersona(e.target.value)}
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm max-w-xs"
            >
              <option value="">Todas</option>
              {personasData.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <span className="ml-auto font-semibold">Total: <span className="text-emerald-600">${totalPagos.toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2})}</span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[rgb(var(--muted))]">
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Persona</th>
                  <th className="px-3 py-2 text-left">Cuenta</th>
                  <th className="px-3 py-2 text-left">Categoría</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-[rgb(var(--subtext))]">No hay pagos registrados</td></tr>
                ) : pagosFiltrados.map((p, i) => (
                  <tr key={p._id || i} className="border-b last:border-b-0 border-[rgb(var(--border))]">
                    <td className="px-3 py-2">{p.date ? new Date(p.date).toLocaleDateString() : ""}</td>
                    <td className="px-3 py-2">{p.person?.name || "-"}</td>
                    <td className="px-3 py-2">{p.account?.name || "-"}</td>
                    <td className="px-3 py-2">{p.category?.name || "-"}</td>
                    <td className="px-3 py-2 text-right text-rose-600 font-semibold">${typeof p.amount === "number" ? p.amount.toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2}) : p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
