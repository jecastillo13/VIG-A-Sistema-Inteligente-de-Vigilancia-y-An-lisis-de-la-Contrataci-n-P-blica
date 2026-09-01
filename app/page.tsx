'use client';

import {
  AlertTriangle, Bell, Building2,
  ChevronDown, CircleHelp, FileSearch, Filter, LayoutDashboard,
  Download, Menu, Network, Search, ShieldCheck, SlidersHorizontal, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ContractRow = {
  id: string; entity: string; department: string; supplier: string; value: string;
  rawValue: number; mode: string; risk: number | null; updated: string; rawDate: string;
  sourceUrl: string | null; description: string;
};

type ApiContract = {
  id: string; value: number; procurementMethod?: string; signedAt?: string;
  riskScore?: number; sourceUrl?: string; description?: string;
  entity?: { name?: string; department?: string; city?: string };
  supplier?: { name?: string };
  source?: { processUrl?: string };
};

type ApiResponse = { data: ApiContract[]; meta?: { backend?: string } };

function RiskBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Pendiente</span>;
  const tone = value >= 70 ? 'bg-rose-50 text-rose-700 ring-rose-200' : value >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return <span className={`inline-flex min-w-12 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${tone}`}>{value}</span>;
}

export default function Home() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ContractRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [method, setMethod] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [backend, setBackend] = useState('');
  const filtered = useMemo(() => contracts.filter((c) => {
    const matchesQuery = `${c.id} ${c.entity} ${c.supplier}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!method || c.mode === method) && (!priorityOnly || (c.risk ?? 0) >= 70);
  }).sort((a, b) => {
    if (sort === 'value-desc') return b.rawValue - a.rawValue;
    if (sort === 'value-asc') return a.rawValue - b.rawValue;
    if (sort === 'entity-asc') return a.entity.localeCompare(b.entity, 'es');
    return Date.parse(b.rawDate) - Date.parse(a.rawDate);
  }), [contracts, method, priorityOnly, query, sort]);

  const pageSize = 25;
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const effectivePage = Math.min(page, pageCount);
  const visibleContracts = filtered.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);
  const methods = useMemo(() => [...new Set(contracts.map((contract) => contract.mode))].sort((a, b) => a.localeCompare(b, 'es')), [contracts]);

  const totalValue = useMemo(() => contracts.reduce((sum, contract) => sum + contract.rawValue, 0), [contracts]);
  const entityCount = useMemo(() => new Set(contracts.map((contract) => contract.entity)).size, [contracts]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/contracts?limit=500`)
      .then(async (response) => {
        if (!response.ok) throw new Error('La API local no respondió correctamente.');
        return response.json();
      })
      .then((payload: unknown) => {
        const response = payload as ApiResponse;
        const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        const mapped: ContractRow[] = response.data.map((contract) => ({
          id: String(contract.id),
          entity: String(contract.entity?.name || 'Entidad sin nombre'),
          department: String(contract.entity?.department || contract.entity?.city || 'Sin ubicación'),
          supplier: String(contract.supplier?.name || 'Proveedor no informado'),
          value: currency.format(Number(contract.value || 0)),
          rawValue: Number(contract.value || 0),
          mode: String(contract.procurementMethod || 'Sin modalidad'),
          risk: typeof contract.riskScore === 'number' && contract.riskScore > 0 ? contract.riskScore : null,
          updated: contract.signedAt ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(contract.signedAt)) : 'Sin fecha',
          rawDate: String(contract.signedAt || ''),
          sourceUrl: contract.sourceUrl || contract.source?.processUrl || null,
          description: String(contract.description || 'Sin descripción'),
        }));
        setContracts(mapped);
        setSelected(mapped[0] || null);
        setBackend(String(response.meta?.backend || 'api'));
      })
      .catch(() => setLoadError('No fue posible cargar los contratos. Ejecuta pnpm dev:all para iniciar la web y la API.'))
      .finally(() => setLoading(false));
  }, []);

  function downloadReport() {
    const header = 'Contrato,Entidad,Proveedor,Valor,Modalidad,Riesgo';
    const rows = filtered.map((contract) => [contract.id, contract.entity, contract.supplier, contract.value, contract.mode, contract.risk]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vigia-contratos-priorizados.csv';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Informe descargado con los contratos visibles.');
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
        <button className="mr-3 rounded-lg p-2 text-slate-600 md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Abrir menú"><Menu size={20}/></button>
        <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[#133c74] text-white"><ShieldCheck size={21}/></span><div><strong className="block text-[15px] leading-4 tracking-[.14em]">VIGÍA</strong><span className="text-[10px] font-semibold tracking-widest text-slate-500">RADAR SECOP</span></div></div>
        <div className="ml-auto flex items-center gap-2"><button className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Alertas"><Bell size={18}/><span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white"/></button><button className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold sm:flex"><span className="grid size-6 place-items-center rounded-full bg-blue-100 text-[10px] text-blue-800">AM</span>Analista <ChevronDown size={14}/></button></div>
      </header>

      <aside className={`${navOpen ? 'flex' : 'hidden'} fixed bottom-0 left-0 top-16 z-20 w-60 flex-col border-r border-slate-200 bg-[#0d274b] p-3 text-blue-100 md:flex`}>
        <nav className="space-y-1 text-sm" aria-label="Navegación principal"><a className="flex items-center gap-3 rounded-xl bg-white/12 px-3 py-3 font-semibold text-white" href="#panorama"><LayoutDashboard size={18}/>Panorama nacional</a><a className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/8" href="#contratos"><FileSearch size={18}/>Contratos</a><button onClick={()=>setNotice('El módulo de entidades se conectará cuando integremos SECOP II.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"><Building2 size={18}/>Entidades</button><button onClick={()=>setNotice('El módulo de proveedores se conectará cuando integremos SECOP II.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"><Users size={18}/>Proveedores</button><button onClick={()=>setNotice('La red contractual estará disponible en una siguiente fase.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"><Network size={18}/>Red contractual</button></nav>
        <div className="mt-auto rounded-xl bg-white/8 p-3 text-xs leading-5 text-blue-100"><div className="mb-1 flex items-center gap-2 font-bold text-white"><CircleHelp size={15}/>Uso responsable</div>Los indicadores orientan la revisión. No constituyen prueba de irregularidad.</div>
      </aside>

      <section className="md:pl-60" id="panorama"><div className="mx-auto max-w-[1600px] p-4 md:p-7">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-[#1e5b9d]">INVÍAS · Vigencia 2025</p><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Contratos reales de SECOP II</h1><p className="mt-1 text-sm text-slate-500">Fuente oficial SECOP II · API local {backend ? `· ${backend}` : ''}</p></div><div className="flex gap-2"><button onClick={()=>setNotice('Las alertas se habilitarán en la fase del motor de riesgo.')} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold"><SlidersHorizontal size={16}/>Configurar alertas</button><button onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-[#155b9b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"><Download size={16}/>Generar informe</button></div></div>

        {notice && <output className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>{notice}</span><button onClick={()=>setNotice('')} className="rounded-md p-1 hover:bg-blue-100" aria-label="Cerrar mensaje"><X size={16}/></button></output>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[[new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',notation:'compact',maximumFractionDigits:1}).format(totalValue),'Valor cargado',`${contracts.length} contratos`], [String(contracts.length),'Contratos cargados','SECOP II real'], ['Pendiente','Índice de riesgo','Fase 3'], [String(entityCount),'Entidades analizadas','Muestra piloto']].map(([value,label,note]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/.04)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div><span className={`rounded-lg p-2 ${label === 'Índice de riesgo' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-700'}`}>{label === 'Índice de riesgo' ? <AlertTriangle size={18}/> : <Building2 size={18}/>}</span></div><p className="mt-3 text-xs font-semibold text-slate-500">{note}</p></article>)}
        </div>

        {loading && <output className="mt-4 block rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Cargando contratos reales…</output>}
        {loadError && <output className="mt-4 block rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{loadError}</output>}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,.8fr)]">
          <section id="contratos" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h2 className="font-bold">Contratos de mayor riesgo</h2><p className="text-xs text-slate-500">Filtra y ordena los registros oficiales cargados</p></div><div className="ml-auto flex gap-2"><label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-200"><Search size={16} className="text-slate-400"/><input value={query} onChange={(e)=>{setQuery(e.target.value);setPage(1)}} className="w-36 outline-none" placeholder="Buscar contrato" aria-label="Buscar contrato"/></label><button onClick={()=>{setPriorityOnly(!priorityOnly);setPage(1)}} aria-pressed={priorityOnly} className={`rounded-xl border p-2.5 ${priorityOnly ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`} aria-label="Mostrar solo contratos prioritarios"><Filter size={17}/></button></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Modalidad<select value={method} onChange={(event)=>{setMethod(event.target.value);setPage(1)}} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Todas las modalidades</option>{methods.map((item)=><option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Orden<select value={sort} onChange={(event)=>{setSort(event.target.value);setPage(1)}} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="date-desc">Más recientes</option><option value="value-desc">Mayor valor</option><option value="value-asc">Menor valor</option><option value="entity-asc">Entidad A–Z</option></select></label></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Contrato</th><th className="px-4 py-3 font-semibold">Entidad / proveedor</th><th className="px-4 py-3 font-semibold">Valor</th><th className="px-4 py-3 font-semibold">Modalidad</th><th className="px-4 py-3 text-center font-semibold">Riesgo</th></tr></thead><tbody>{visibleContracts.map(c => <tr key={c.id} className={`border-t border-slate-100 transition hover:bg-blue-50/50 ${selected?.id===c.id?'bg-blue-50/70':''}`}><td className="px-5 py-4"><button onClick={()=>{setSelected(c);setDetailOpen(true)}} className="text-left" aria-label={`Ver detalles del contrato ${c.id}`}><strong className="text-[#174f8c] underline-offset-2 hover:underline">{c.id}</strong><span className="mt-1 block text-xs text-slate-400">Firmado: {c.updated}</span></button></td><td className="px-4 py-4"><strong className="block font-semibold">{c.entity}</strong><span className="text-xs text-slate-500">{c.supplier} · {c.department}</span></td><td className="px-4 py-4 font-semibold tabular-nums">{c.value}</td><td className="px-4 py-4 text-slate-600">{c.mode}</td><td className="px-4 py-4 text-center"><RiskBadge value={c.risk}/></td></tr>)}{!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500"><strong className="block text-slate-700">No encontramos contratos</strong><span className="text-xs">Prueba otra búsqueda o desactiva el filtro prioritario.</span></td></tr>}</tbody></table></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500"><span>Mostrando {visibleContracts.length} de {filtered.length} resultados · {contracts.length} contratos cargados</span><div className="flex items-center gap-2"><button disabled={effectivePage===1} onClick={()=>setPage((current)=>Math.max(current-1,1))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Anterior</button><span>Página {effectivePage} de {pageCount}</span><button disabled={effectivePage===pageCount} onClick={()=>setPage((current)=>Math.min(current+1,pageCount))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Siguiente</button></div></div>
          </section>

          {detailOpen && selected && <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(15_23_42/.06)]"><div className="flex items-start gap-3 border-b border-slate-200 p-5"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">REAL</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Contrato SECOP II</p><h2 className="truncate font-bold">{selected.id}</h2><p className="truncate text-xs text-slate-500">{selected.entity}</p></div><button onClick={()=>setDetailOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar detalle"><X size={17}/></button></div><div className="p-5"><h3 className="text-sm font-bold">Información contractual</h3><p className="mt-2 text-xs leading-5 text-slate-600">{selected.description}</p><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-slate-500">Proveedor</dt><dd className="font-semibold">{selected.supplier}</dd></div><div><dt className="text-slate-500">Modalidad</dt><dd className="font-semibold">{selected.mode}</dd></div><div><dt className="text-slate-500">Valor</dt><dd className="font-semibold">{selected.value}</dd></div></dl><div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Riesgo pendiente:</strong> los indicadores objetivos se calcularán en la Fase 3.</div>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 block w-full rounded-xl bg-[#123d70] py-3 text-center text-sm font-bold text-white">Abrir proceso original en SECOP</a>}<p className="mt-4 text-[11px] leading-4 text-slate-500">Los datos provienen de SECOP II y deben verificarse en la fuente original.</p></div></aside>}
        </div>
      </div></section>
    </main>
  );
}
