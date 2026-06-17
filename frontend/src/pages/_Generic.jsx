import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function Generic({ name, title, fields, testid }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(f => [f.key, ""])));

  const load = async () => {
    const { data } = await api.get(`/collections/${name}`);
    setItems(data.items || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api.post(`/collections/${name}`, form); toast.success(`${title.slice(0,-1)} created`); load(); setForm(Object.fromEntries(fields.map(f => [f.key, ""]))); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    try { await api.delete(`/collections/${name}/${id}`); toast("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div data-testid={testid}>
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">{title}</div>
      <h1 className="font-serif text-4xl mt-2">{title}</h1>
      <div className="surface mt-6 p-5 grid md:grid-cols-3 gap-3">
        {fields.map(f => (
          <input key={f.key} placeholder={f.label} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-2 text-sm" data-testid={`${testid}-${f.key}`} />
        ))}
        <button onClick={create} className="btn-discord rounded-md px-4 py-2 text-sm" data-testid={`${testid}-create`}>Create</button>
      </div>
      <div className="surface mt-6 divide-y divide-[var(--border)]">
        {items.length === 0 && <div className="p-6 text-sm text-[var(--text-2)]">Nothing yet.</div>}
        {items.map(i => (
          <div key={i.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm">{fields.map(f => i[f.key]).filter(Boolean).join(" · ")}</div>
              <div className="text-xs text-[var(--text-2)]">by {i.created_by} · {new Date(i.created_at).toLocaleString()}</div>
            </div>
            <button onClick={() => remove(i.id)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function makePage(name, title, fields, testid) {
  return () => <Generic name={name} title={title} fields={fields} testid={testid} />;
}
export default Generic;
