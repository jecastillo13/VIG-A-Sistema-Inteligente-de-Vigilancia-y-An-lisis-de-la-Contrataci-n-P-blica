'use client';

import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Building2,
  ChevronDown, CircleHelp, FileSearch, Filter, LayoutDashboard,
  Download, Menu, Network, Search, ShieldCheck, SlidersHorizontal, Users, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const contracts = [
  { id: 'C-2026-184', entity: 'Alcaldía de Puerto Claro', department: 'Bolívar', supplier: 'Infraestructura del Caribe S.A.S.', value: '$87.400 M', mode: 'Contratación directa', risk: 92, updated: 'Hace 12 min', trend: 5 },
  { id: 'CD-881-2026', entity: 'Gobernación del Norte', department: 'Santander', supplier: 'Soluciones Integrales Andinas', value: '$29.800 M', mode: 'Contratación directa', risk: 85, updated: 'Hace 34 min', trend: 2 },
  { id: 'LP-034-2026', entity: 'Instituto Nacional de Vías', department: 'Nacional', supplier: 'Consorcio Vías 2026', value: '$63.100 M', mode: 'Licitación pública', risk: 78, updated: 'Hace 1 h', trend: -3 },
  { id: 'SAMC-109', entity: 'Hospital Regional del Centro', department: 'Cundinamarca', supplier: 'Médica Colombia S.A.S.', value: '$8.260 M', mode: 'Selección abreviada', risk: 67, updated: 'Hace 2 h', trend: 6 },
  { id: 'MC-2026-045', entity: 'Alcaldía de San Miguel', department: 'Antioquia', supplier: 'Suministros JG', value: '$940 M', mode: 'Mínima cuantía', risk: 54, updated: 'Hace 3 h', trend: -1 },
];

const factors = [
  { name: 'Contratación directa inusual', detail: 'Valor 4,2× superior a la mediana de la entidad', score: 18, max: 20 },
  { name: 'Concentración del proveedor', detail: '7 contratos con la misma entidad en 12 meses', score: 17, max: 20 },
  { name: 'Valor atípico', detail: '210 % por encima de 137 contratos comparables', score: 18, max: 20 },
  { name: 'Estudio de mercado débil', detail: 'Se encontró una única cotización', score: 14, max: 15 },
  { name: 'Tiempos atípicos', detail: '2 días entre publicación y firma', score: 8, max: 10 },
];

function RiskBadge({ value }: { value: number }) {
  const tone = value >= 70 ? 'bg-rose-50 text-rose-700 ring-rose-200' : value >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return <span className={`inline-flex min-w-12 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${tone}`}>{value}</span>;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(contracts[0]);
  const [detailOpen, setDetailOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => contracts.filter((c) => {
    const matchesQuery = `${c.id} ${c.entity} ${c.supplier}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!priorityOnly || c.risk >= 70);
  }), [priorityOnly, query]);

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
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-[#1e5b9d]">Monitoreo nacional · Vigencia 2026</p><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Panorama de riesgo contractual</h1><p className="mt-1 text-sm text-slate-500">Actualizado hoy, 15:42 · Fuentes de demostración SECOP II</p></div><div className="flex gap-2"><button onClick={()=>setNotice('Las alertas podrán configurarse cuando exista una fuente de datos real.')} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold"><SlidersHorizontal size={16}/>Configurar alertas</button><button onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-[#155b9b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"><Download size={16}/>Generar informe</button></div></div>

        {notice && <output className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>{notice}</span><button onClick={()=>setNotice('')} className="rounded-md p-1 hover:bg-blue-100" aria-label="Cerrar mensaje"><X size={16}/></button></output>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[['$24,6 billones','Valor analizado','12,4 %',true],['18.432','Procesos monitoreados','864 hoy',true],['127','Contratos prioritarios','18 nuevos',true],['1.281','Entidades analizadas','97 % cobertura',false]].map(([value,label,note,up]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/.04)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label as string}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value as string}</p></div><span className={`rounded-lg p-2 ${label === 'Contratos prioritarios' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{label === 'Contratos prioritarios' ? <AlertTriangle size={18}/> : <Building2 size={18}/>}</span></div><p className={`mt-3 flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-700' : 'text-slate-500'}`}>{up ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {note as string} <span className="font-normal text-slate-400">vs. ayer</span></p></article>)}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,.8fr)]">
          <section id="contratos" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center"><div><h2 className="font-bold">Contratos de mayor riesgo</h2><p className="text-xs text-slate-500">Priorizados por indicadores objetivos y reproducibles</p></div><div className="ml-auto flex gap-2"><label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-200"><Search size={16} className="text-slate-400"/><input value={query} onChange={(e)=>setQuery(e.target.value)} className="w-36 outline-none" placeholder="Buscar contrato" aria-label="Buscar contrato"/></label><button onClick={()=>setPriorityOnly(!priorityOnly)} aria-pressed={priorityOnly} className={`rounded-xl border p-2.5 ${priorityOnly ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`} aria-label="Mostrar solo contratos prioritarios"><Filter size={17}/></button></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Contrato</th><th className="px-4 py-3 font-semibold">Entidad / proveedor</th><th className="px-4 py-3 font-semibold">Valor</th><th className="px-4 py-3 font-semibold">Modalidad</th><th className="px-4 py-3 text-center font-semibold">Riesgo</th></tr></thead><tbody>{filtered.map(c => <tr key={c.id} className={`border-t border-slate-100 transition hover:bg-blue-50/50 ${selected.id===c.id?'bg-blue-50/70':''}`}><td className="px-5 py-4"><button onClick={()=>{setSelected(c);setDetailOpen(true)}} className="text-left" aria-label={`Ver detalles del contrato ${c.id}`}><strong className="text-[#174f8c] underline-offset-2 hover:underline">{c.id}</strong><span className="mt-1 block text-xs text-slate-400">{c.updated}</span></button></td><td className="px-4 py-4"><strong className="block font-semibold">{c.entity}</strong><span className="text-xs text-slate-500">{c.supplier} · {c.department}</span></td><td className="px-4 py-4 font-semibold tabular-nums">{c.value}</td><td className="px-4 py-4 text-slate-600">{c.mode}</td><td className="px-4 py-4 text-center"><RiskBadge value={c.risk}/><span className={`ml-1 text-[10px] font-bold ${c.trend>0?'text-rose-500':'text-emerald-600'}`}>{c.trend>0?'+':''}{c.trend}</span></td></tr>)}{filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500"><strong className="block text-slate-700">No encontramos contratos</strong><span className="text-xs">Prueba otra búsqueda o desactiva el filtro prioritario.</span></td></tr>}</tbody></table></div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500"><span>Mostrando {filtered.length} de 127 prioritarios</span><button className="font-bold text-[#155b9b]">Ver todos los contratos →</button></div>
          </section>

          {detailOpen && <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(15_23_42/.06)]"><div className="flex items-start gap-3 border-b border-slate-200 p-5"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-xl font-black text-rose-700">{selected.risk}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Riesgo prioritario</p><h2 className="truncate font-bold">{selected.id}</h2><p className="truncate text-xs text-slate-500">{selected.entity}</p></div><button onClick={()=>setDetailOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar detalle"><X size={17}/></button></div><div className="p-5"><h3 className="text-sm font-bold">¿Por qué fue marcado?</h3><p className="mb-4 mt-1 text-xs leading-5 text-slate-500">Cinco factores explican el puntaje. Selecciona un contrato para actualizar este panel.</p><div className="space-y-4">{factors.map(f=><div key={f.name}><div className="mb-1.5 flex justify-between gap-3 text-xs"><div><strong className="block text-slate-800">{f.name}</strong><span className="text-[11px] text-slate-500">{f.detail}</span></div><span className="shrink-0 font-black text-rose-700">+{f.score}<small className="font-medium text-slate-400">/{f.max}</small></span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{width:`${f.score/f.max*100}%`}}/></div></div>)}</div><button onClick={()=>setNotice('El expediente se habilitará al conectar los documentos reales de SECOP II.')} className="mt-5 w-full rounded-xl bg-[#123d70] py-3 text-sm font-bold text-white">Abrir expediente y explicación</button><p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] leading-4 text-amber-900"><strong>Importante:</strong> Este resultado señala factores que justifican revisión adicional; no prueba irregularidad, responsabilidad ni corrupción.</p></div></aside>}
        </div>
      </div></section>
    </main>
  );
}
