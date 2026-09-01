'use client';

import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  FileSearch,
  LayoutDashboard,
  Download,
  Menu,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ContractRow = {
  id: string;
  entity: string;
  department: string;
  supplier: string;
  value: string;
  rawValue: number;
  mode: string;
  risk: number | null;
  updated: string;
  rawDate: string;
  sourceUrl: string | null;
  description: string;
  riskSignals: RiskSignal[];
  process: ProcessMetrics | null;
  documentCount: number;
  documents: ContractDocument[];
  extractedDocuments: ExtractedDocument[];
  documentExplanation: DocumentExplanation | null;
};

type ContractDocument = {
  id: string;
  fileName: string;
  extension?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | null;
  sourceUrl: string;
};

type ExtractedDocument = {
  id: string;
  fileName: string;
  sourceUrl: string;
  pageCount: number;
  textCharCount: number;
  extractedAt?: string | null;
  pages: { pageNumber: number; excerpt: string }[];
};

type DocumentFinding = {
  category: 'need' | 'justification' | 'budget' | 'market';
  status: 'found' | 'not_found';
  documentId?: string | null;
  fileName?: string | null;
  sourceUrl?: string | null;
  pageNumber?: number | null;
  excerpt?: string | null;
  reviewDecision?: 'confirmed' | 'rejected' | null;
  reviewNote?: string | null;
};

type DocumentExplanation = {
  status: 'analyzed';
  analyzerVersion: string;
  analyzedAt?: string | null;
  categories: DocumentFinding[];
};

type ProcessMetrics = {
  id?: string | null;
  publishedAt?: string | null;
  awardedAt?: string | null;
  estimatedValue?: number | null;
  awardedValue?: number | null;
  offerCount?: number | null;
  uniqueBidderCount?: number | null;
  lotCount?: number | null;
};

type RiskSignal = {
  code: string;
  version: string;
  score: number;
  evidence?: { explanation?: string; limitation?: string };
};

type ApiContract = {
  id: string;
  value: number;
  procurementMethod?: string;
  signedAt?: string;
  riskScore?: number;
  sourceUrl?: string;
  description?: string;
  riskSignals?: RiskSignal[];
  process?: ProcessMetrics;
  documentCount?: number;
  documents?: ContractDocument[];
  extractedDocuments?: ExtractedDocument[];
  documentExplanation?: DocumentExplanation | null;
  entity?: { name?: string; department?: string; city?: string };
  supplier?: { name?: string };
  source?: { processUrl?: string };
};

type ApiResponse = { data: ApiContract[]; meta?: { backend?: string } };

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function displayDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : 'No disponible';
}

function displaySize(value?: number | null) {
  if (value == null) return 'Tamaño no disponible';
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(value / 1_000))} KB`;
}

function documentReviewStatus(contract: ContractRow) {
  const categories = contract.documentExplanation?.categories;
  if (!categories?.length) return 'unanalyzed';
  if (categories.some((finding) => finding.reviewDecision === 'rejected'))
    return 'rejected';
  if (categories.every((finding) => finding.reviewDecision === 'confirmed'))
    return 'reviewed';
  return 'pending';
}

function documentEvidenceStatus(contract: ContractRow) {
  if (contract.documentCount === 0) return 'no_documents';
  if (!contract.documentExplanation) return 'not_analyzed';
  if (
    contract.documentExplanation.categories.some(
      (finding) => finding.status === 'not_found',
    )
  )
    return 'not_found';
  return 'found';
}

function documentMatchesReviewFilter(contract: ContractRow, filter: string) {
  const categories = contract.documentExplanation?.categories;
  if (filter === 'all') return true;
  if (filter === 'no_documents')
    return documentEvidenceStatus(contract) === 'no_documents';
  if (filter === 'not_analyzed')
    return documentEvidenceStatus(contract) === 'not_analyzed';
  if (filter === 'not_found')
    return documentEvidenceStatus(contract) === 'not_found';
  if (filter === 'unanalyzed') return !categories?.length;
  if (!categories?.length) return false;
  if (filter === 'pending')
    return categories.some((finding) => !finding.reviewDecision);
  if (filter === 'rejected')
    return categories.some((finding) => finding.reviewDecision === 'rejected');
  if (filter === 'reviewed')
    return categories.every((finding) => finding.reviewDecision === 'confirmed');
  return true;
}

function RiskBadge({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        Pendiente
      </span>
    );
  const tone =
    value >= 70
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : value >= 50
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${tone}`}
    >
      {value}
    </span>
  );
}

export default function Home() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ContractRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [method, setMethod] = useState('');
  const [sort, setSort] = useState('risk-desc');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [backend, setBackend] = useState('');
  const [reviewingCategory, setReviewingCategory] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const filtered = useMemo(
    () =>
      contracts
        .filter((c) => {
          const matchesQuery = `${c.id} ${c.entity} ${c.supplier}`
            .toLowerCase()
            .includes(query.toLowerCase());
          return (
            matchesQuery &&
            (!method || c.mode === method) &&
            documentMatchesReviewFilter(c, documentFilter) &&
            (riskFilter === 'all' ||
              (riskFilter === 'signaled' && c.risk !== null) ||
              (riskFilter === 'high' && (c.risk ?? 0) >= 50) ||
              (riskFilter === 'priority' && (c.risk ?? 0) >= 70))
          );
        })
        .sort((a, b) => {
          if (sort === 'risk-desc') return (b.risk || 0) - (a.risk || 0);
          if (sort === 'value-desc') return b.rawValue - a.rawValue;
          if (sort === 'value-asc') return a.rawValue - b.rawValue;
          if (sort === 'entity-asc')
            return a.entity.localeCompare(b.entity, 'es');
          return Date.parse(b.rawDate) - Date.parse(a.rawDate);
        }),
    [contracts, documentFilter, method, query, riskFilter, sort],
  );

  const pageSize = 25;
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const effectivePage = Math.min(page, pageCount);
  const visibleContracts = filtered.slice(
    (effectivePage - 1) * pageSize,
    effectivePage * pageSize,
  );
  const methods = useMemo(
    () =>
      [...new Set(contracts.map((contract) => contract.mode))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [contracts],
  );

  const totalValue = useMemo(
    () => contracts.reduce((sum, contract) => sum + contract.rawValue, 0),
    [contracts],
  );
  const entityCount = useMemo(
    () => new Set(contracts.map((contract) => contract.entity)).size,
    [contracts],
  );
  const maxRisk = useMemo(
    () => Math.max(0, ...contracts.map((contract) => contract.risk || 0)),
    [contracts],
  );
  const signaledCount = useMemo(
    () => contracts.filter((contract) => contract.risk !== null).length,
    [contracts],
  );
  const analyzedDocumentCount = useMemo(
    () =>
      contracts.filter((contract) => documentReviewStatus(contract) !== 'unanalyzed')
        .length,
    [contracts],
  );
  const pendingDocumentCount = useMemo(
    () =>
      contracts.filter((contract) =>
        documentMatchesReviewFilter(contract, 'pending'),
      ).length,
    [contracts],
  );
  const documentQuality = useMemo(() => {
    const findings = contracts.flatMap(
      (contract) => contract.documentExplanation?.categories || [],
    );
    const confirmed = findings.filter(
      (finding) => finding.reviewDecision === 'confirmed',
    ).length;
    const rejected = findings.filter(
      (finding) => finding.reviewDecision === 'rejected',
    ).length;
    const reviewed = confirmed + rejected;
    const pending = findings.length - reviewed;
    return {
      total: findings.length,
      reviewed,
      confirmed,
      rejected,
      pending,
      found: findings.filter((finding) => finding.status === 'found').length,
      notFound: findings.filter((finding) => finding.status === 'not_found').length,
      progress: findings.length ? Math.round((reviewed / findings.length) * 100) : 0,
    };
  }, [contracts]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/contracts?limit=500&sort=riskScore&direction=desc`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error('La API local no respondió correctamente.');
        return response.json();
      })
      .then((payload: unknown) => {
        const response = payload as ApiResponse;
        const currency = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        });
        const mapped: ContractRow[] = response.data.map((contract) => ({
          id: String(contract.id),
          entity: String(contract.entity?.name || 'Entidad sin nombre'),
          department: String(
            contract.entity?.department ||
              contract.entity?.city ||
              'Sin ubicación',
          ),
          supplier: String(contract.supplier?.name || 'Proveedor no informado'),
          value: currency.format(Number(contract.value || 0)),
          rawValue: Number(contract.value || 0),
          mode: String(contract.procurementMethod || 'Sin modalidad'),
          risk:
            typeof contract.riskScore === 'number' && contract.riskScore > 0
              ? contract.riskScore
              : null,
          updated: contract.signedAt
            ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
                new Date(contract.signedAt),
              )
            : 'Sin fecha',
          rawDate: String(contract.signedAt || ''),
          sourceUrl: contract.sourceUrl || contract.source?.processUrl || null,
          description: String(contract.description || 'Sin descripción'),
          riskSignals: Array.isArray(contract.riskSignals)
            ? contract.riskSignals
            : [],
          process: contract.process || null,
          documentCount: Number(contract.documentCount || 0),
          documents: Array.isArray(contract.documents) ? contract.documents : [],
          extractedDocuments: Array.isArray(contract.extractedDocuments)
            ? contract.extractedDocuments
            : [],
          documentExplanation: contract.documentExplanation || null,
        }));
        setContracts(mapped);
        setSelected(mapped[0] || null);
        setBackend(String(response.meta?.backend || 'api'));
      })
      .catch(() =>
        setLoadError(
          'No fue posible cargar los contratos. Ejecuta pnpm dev:all para iniciar la web y la API.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  function updateSearch(value: string) {
    setQuery(value);
    setPage(1);
    const normalized = value.trim().toLocaleLowerCase('es');
    if (!normalized) return;
    const matches = contracts.filter((contract) =>
      `${contract.id} ${contract.entity} ${contract.supplier}`
        .toLocaleLowerCase('es')
        .includes(normalized),
    );
    if (matches.length === 1) {
      setSelected(matches[0]);
      setDetailOpen(true);
    }
  }

  function showDocumentQueue(status = 'pending', resetOtherFilters = false) {
    setQuery('');
    setDocumentFilter(status);
    setPage(1);
    if (resetOtherFilters) {
      setMethod('');
      setRiskFilter('all');
    }
    const candidates = contracts.filter(
      (contract) =>
        documentMatchesReviewFilter(contract, status) &&
        (resetOtherFilters || !method || contract.mode === method) &&
        (resetOtherFilters ||
          riskFilter === 'all' ||
          (riskFilter === 'signaled' && contract.risk !== null) ||
          (riskFilter === 'high' && (contract.risk ?? 0) >= 50) ||
          (riskFilter === 'priority' && (contract.risk ?? 0) >= 70)),
    );
    setSelected(candidates[0] || null);
    setDetailOpen(candidates.length > 0);
  }

  function downloadReport() {
    const header =
      'Contrato,Entidad,Proveedor,Valor,Modalidad,Riesgo,Reglas,Evidencia,Proceso oficial,Documentos,Fuente SECOP';
    const rows = filtered.map((contract) =>
      [
        contract.id,
        contract.entity,
        contract.supplier,
        contract.value,
        contract.mode,
        contract.risk ?? 0,
        contract.riskSignals.map((signal) => signal.code).join(' | '),
        contract.riskSignals
          .map((signal) => signal.evidence?.explanation || '')
          .join(' | '),
        contract.process?.id || '',
        contract.documentCount,
        contract.sourceUrl || '',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vigia-contratos-priorizados.csv';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Informe descargado con los contratos visibles.');
  }

  function downloadDocumentQualityReport() {
    const header =
      'Contrato,Entidad,Categoría,Resultado automático,Decisión humana,Observación,Documento,Página,Fuente';
    const rows = contracts.flatMap((contract) =>
      (contract.documentExplanation?.categories || []).map((finding) =>
        [
          contract.id,
          contract.entity,
          finding.category,
          finding.status === 'found' ? 'Encontrado' : 'No encontrado',
          finding.reviewDecision === 'confirmed'
            ? 'Confirmado'
            : finding.reviewDecision === 'rejected'
              ? 'Rechazado'
              : 'Pendiente',
          finding.reviewNote || '',
          finding.documentId || '',
          finding.pageNumber || '',
          finding.sourceUrl || '',
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      ),
    );
    const summary = [
      `Progreso,${documentQuality.progress}%`,
      `Resultados revisados,${documentQuality.reviewed}`,
      `Resultados pendientes,${documentQuality.pending}`,
      `Confirmados,${documentQuality.confirmed}`,
      `Rechazados,${documentQuality.rejected}`,
      `Información encontrada,${documentQuality.found}`,
      `Información no encontrada,${documentQuality.notFound}`,
      '',
    ];
    const blob = new Blob([[...summary, header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vigia-calidad-piloto-documental.csv';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Reporte de calidad documental descargado.');
  }

  async function reviewCitation(
    category: DocumentFinding['category'],
    decision: 'confirmed' | 'rejected',
  ) {
    if (!selected?.documentExplanation) return;
    setReviewingCategory(category);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${apiUrl}/contracts/${encodeURIComponent(selected.id)}/document-reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            decision,
            note: reviewNotes[`${selected.id}:${category}`]?.trim() || undefined,
          }),
        },
      );
      if (!response.ok) throw new Error('No fue posible guardar la revisión.');
      const update = (contract: ContractRow): ContractRow => {
        if (contract.id !== selected.id || !contract.documentExplanation)
          return contract;
        return {
          ...contract,
          documentExplanation: {
            ...contract.documentExplanation,
            categories: contract.documentExplanation.categories.map((finding) =>
              finding.category === category
                ? {
                    ...finding,
                    reviewDecision: decision,
                    reviewNote:
                      reviewNotes[`${selected.id}:${category}`]?.trim() || null,
                  }
                : finding,
            ),
          },
        };
      };
      const updatedContracts = contracts.map(update);
      const updatedSelected = update(selected);
      const contractCompleted = !documentMatchesReviewFilter(
        updatedSelected,
        'pending',
      );
      let nextPending: ContractRow | undefined;
      if (contractCompleted && documentFilter === 'pending') {
        const orderedIds = filtered.map((contract) => contract.id);
        const currentIndex = orderedIds.indexOf(selected.id);
        const nextIds = [
          ...orderedIds.slice(currentIndex + 1),
          ...orderedIds.slice(0, currentIndex),
        ];
        nextPending = nextIds
          .map((id) => updatedContracts.find((contract) => contract.id === id))
          .find(
            (contract): contract is ContractRow =>
              Boolean(
                contract &&
                  documentMatchesReviewFilter(contract, 'pending'),
              ),
          );
      }
      setContracts(updatedContracts);
      setSelected(nextPending || updatedSelected);
      if (nextPending) {
        setNotice(
          `Contrato completado. Continuamos con el siguiente pendiente: ${nextPending.id}.`,
        );
      } else if (contractCompleted && documentFilter === 'pending') {
        setNotice('Revisión del piloto completada: no quedan citas pendientes.');
      } else {
        setNotice(
          decision === 'confirmed'
            ? 'Cita confirmada por revisión humana.'
            : 'Cita marcada como rechazada para recalibración.',
        );
      }
    } catch {
      setNotice('No fue posible guardar la revisión humana.');
    } finally {
      setReviewingCategory(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
        <button
          className="mr-3 rounded-lg p-2 text-slate-600 md:hidden"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[#133c74] text-white">
            <ShieldCheck size={21} />
          </span>
          <div>
            <strong className="block text-[15px] leading-4 tracking-[.14em]">
              VIGÍA
            </strong>
            <span className="text-[10px] font-semibold tracking-widest text-slate-500">
              RADAR SECOP
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            aria-label="Alertas"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <button className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold sm:flex">
            <span className="grid size-6 place-items-center rounded-full bg-blue-100 text-[10px] text-blue-800">
              AM
            </span>
            Analista <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <aside
        className={`${navOpen ? 'flex' : 'hidden'} fixed bottom-0 left-0 top-16 z-20 w-60 flex-col border-r border-slate-200 bg-[#0d274b] p-3 text-blue-100 md:flex`}
      >
        <nav className="space-y-1 text-sm" aria-label="Navegación principal">
          <a
            className="flex items-center gap-3 rounded-xl bg-white/12 px-3 py-3 font-semibold text-white"
            href="#panorama"
          >
            <LayoutDashboard size={18} />
            Panorama nacional
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/8"
            href="#contratos"
          >
            <FileSearch size={18} />
            Contratos
          </a>
          <button
            onClick={() =>
              setNotice(
                'El módulo de entidades se conectará cuando integremos SECOP II.',
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"
          >
            <Building2 size={18} />
            Entidades
          </button>
          <button
            onClick={() =>
              setNotice(
                'El módulo de proveedores se conectará cuando integremos SECOP II.',
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"
          >
            <Users size={18} />
            Proveedores
          </button>
          <button
            onClick={() =>
              setNotice(
                'La red contractual estará disponible en una siguiente fase.',
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8"
          >
            <Network size={18} />
            Red contractual
          </button>
        </nav>
        <div className="mt-auto rounded-xl bg-white/8 p-3 text-xs leading-5 text-blue-100">
          <div className="mb-1 flex items-center gap-2 font-bold text-white">
            <CircleHelp size={15} />
            Uso responsable
          </div>
          Los indicadores orientan la revisión. No constituyen prueba de
          irregularidad.
        </div>
      </aside>

      <section className="md:pl-60" id="panorama">
        <div className="mx-auto max-w-[1600px] p-4 md:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-[#1e5b9d]">
                INVÍAS · Vigencia 2025
              </p>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Contratos reales de SECOP II
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Fuente oficial SECOP II · API local{' '}
                {backend ? `· ${backend}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setNotice(
                    'El motor v1 está activo. Las notificaciones automáticas se incorporarán en la fase de alertas.',
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold"
              >
                <SlidersHorizontal size={16} />
                Configurar alertas
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 rounded-xl bg-[#155b9b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                <Download size={16} />
                Generar informe
              </button>
            </div>
          </div>

          {notice && (
            <output className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span>{notice}</span>
              <button
                onClick={() => setNotice('')}
                className="rounded-md p-1 hover:bg-blue-100"
                aria-label="Cerrar mensaje"
              >
                <X size={16} />
              </button>
            </output>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(totalValue),
                'Valor cargado',
                `${contracts.length} contratos`,
              ],
              [String(contracts.length), 'Contratos cargados', 'SECOP II real'],
              [
                String(maxRisk),
                'Riesgo máximo',
                `${signaledCount} contratos con señales`,
              ],
              [String(entityCount), 'Entidades analizadas', 'Muestra piloto'],
            ].map(([value, label, note]) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {value}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg p-2 ${label === 'Riesgo máximo' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-700'}`}
                  >
                    {label === 'Riesgo máximo' ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <Building2 size={18} />
                    )}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {note}
                </p>
              </article>
            ))}
          </div>

          {analyzedDocumentCount > 0 && (
            <section className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-cyan-950">
                    Calidad del piloto documental
                  </p>
                  <p className="mt-1 text-xs text-cyan-800">
                    {analyzedDocumentCount} contratos analizados ·{' '}
                    {documentQuality.reviewed} de {documentQuality.total} resultados
                    revisados por una persona.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadDocumentQualityReport}
                    className="rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-900"
                  >
                    Descargar reporte de calidad
                  </button>
                  <button
                    type="button"
                    onClick={() => showDocumentQueue('pending', true)}
                    disabled={pendingDocumentCount === 0}
                    className="rounded-xl bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Revisar citas pendientes
                  </button>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-cyan-700 transition-[width]"
                  style={{ width: `${documentQuality.progress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                {[
                  [`${documentQuality.progress}%`, 'Avance'],
                  [String(documentQuality.pending), 'Pendientes'],
                  [String(documentQuality.confirmed), 'Confirmados'],
                  [String(documentQuality.rejected), 'Rechazados'],
                  [String(documentQuality.notFound), 'No encontrados'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-white px-3 py-2">
                    <strong className="block text-sm text-cyan-950">{value}</strong>
                    <span className="text-[10px] font-semibold text-cyan-700">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loading && (
            <output className="mt-4 block rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Cargando contratos reales…
            </output>
          )}
          {loadError && (
            <output className="mt-4 block rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {loadError}
            </output>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,.8fr)]">
            <section
              id="contratos"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-bold">Contratos priorizados por riesgo</h2>
                    <p className="text-xs text-slate-500">
                      Puntajes explicables para orientar revisión, no para
                      afirmar irregularidades
                    </p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-200">
                      <Search size={16} className="text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => updateSearch(e.target.value)}
                        className="w-36 outline-none"
                        placeholder="Buscar contrato"
                        aria-label="Buscar contrato"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-semibold text-slate-600">
                    Modalidad
                    <select
                      value={method}
                      onChange={(event) => {
                        setMethod(event.target.value);
                        setPage(1);
                      }}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="">Todas las modalidades</option>
                      {methods.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Revisión documental
                    <select
                      value={documentFilter}
                      onChange={(event) => showDocumentQueue(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="all">Todos</option>
                      <option value="pending">Pendientes</option>
                      <option value="reviewed">Confirmados</option>
                      <option value="rejected">Con rechazos</option>
                      <option value="not_found">Información no encontrada</option>
                      <option value="not_analyzed">Documentos por analizar</option>
                      <option value="no_documents">Sin documentos disponibles</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Nivel de riesgo
                    <select
                      value={riskFilter}
                      onChange={(event) => {
                        setRiskFilter(event.target.value);
                        setPage(1);
                      }}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="all">Todos</option>
                      <option value="signaled">Con señales</option>
                      <option value="high">Alto (50–69)</option>
                      <option value="priority">Prioritario (70–100)</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Orden
                    <select
                      value={sort}
                      onChange={(event) => {
                        setSort(event.target.value);
                        setPage(1);
                      }}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="risk-desc">Mayor riesgo</option>
                      <option value="date-desc">Más recientes</option>
                      <option value="value-desc">Mayor valor</option>
                      <option value="value-asc">Menor valor</option>
                      <option value="entity-asc">Entidad A–Z</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Contrato</th>
                      <th className="px-4 py-3 font-semibold">
                        Entidad / proveedor
                      </th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Modalidad</th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Riesgo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleContracts.map((c) => (
                      <tr
                        key={c.id}
                        className={`border-t border-slate-100 transition hover:bg-blue-50/50 ${selected?.id === c.id ? 'bg-blue-50/70' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <button
                            onClick={() => {
                              setSelected(c);
                              setDetailOpen(true);
                            }}
                            className="text-left"
                            aria-label={`Ver detalles del contrato ${c.id}`}
                          >
                            <strong className="text-[#174f8c] underline-offset-2 hover:underline">
                              {c.id}
                            </strong>
                            <span className="mt-1 block text-xs text-slate-400">
                              Firmado: {c.updated}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {documentEvidenceStatus(c) === 'no_documents'
                                  ? 'Sin documentos disponibles'
                                  : documentEvidenceStatus(c) === 'not_analyzed'
                                    ? 'Documentos por analizar'
                                    : documentEvidenceStatus(c) === 'not_found'
                                      ? 'Información no encontrada'
                                      : 'Evidencia localizada'}
                              </span>
                              {documentReviewStatus(c) !== 'unanalyzed' && (
                                <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                                  {documentReviewStatus(c) === 'rejected' &&
                                  documentMatchesReviewFilter(c, 'pending')
                                    ? 'Rechazos y pendientes'
                                    : documentReviewStatus(c) === 'pending'
                                      ? 'Citas pendientes'
                                      : documentReviewStatus(c) === 'reviewed'
                                        ? 'Citas confirmadas'
                                        : 'Citas rechazadas'}
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <strong className="block font-semibold">
                            {c.entity}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {c.supplier} · {c.department}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold tabular-nums">
                          {c.value}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{c.mode}</td>
                        <td className="px-4 py-4 text-center">
                          <RiskBadge value={c.risk} />
                        </td>
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          <strong className="block text-slate-700">
                            No encontramos contratos
                          </strong>
                          <span className="text-xs">
                            Prueba otra búsqueda o ajusta el nivel de riesgo.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                <span>
                  Mostrando {visibleContracts.length} de {filtered.length}{' '}
                  resultados · {contracts.length} contratos cargados
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={effectivePage === 1}
                    onClick={() =>
                      setPage((current) => Math.max(current - 1, 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {effectivePage} de {pageCount}
                  </span>
                  <button
                    disabled={effectivePage === pageCount}
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, pageCount))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </section>

            {detailOpen && selected && (
              <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(15_23_42/.06)]">
                <div className="flex items-start gap-3 border-b border-slate-200 p-5">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                    REAL
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Contrato SECOP II
                    </p>
                    <h2 className="truncate font-bold">{selected.id}</h2>
                    <p className="truncate text-xs text-slate-500">
                      {selected.entity}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    aria-label="Cerrar detalle"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-bold">Información contractual</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {selected.description}
                  </p>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div>
                      <dt className="text-slate-500">Proveedor</dt>
                      <dd className="font-semibold">{selected.supplier}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Modalidad</dt>
                      <dd className="font-semibold">{selected.mode}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Valor</dt>
                      <dd className="font-semibold">{selected.value}</dd>
                    </div>
                  </dl>
                  <section className="mt-5 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold">Métricas del proceso</h3>
                    {selected.process?.id ? (
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-slate-500">Proceso oficial</dt>
                          <dd className="font-semibold">{selected.process.id}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Oferentes únicos</dt>
                          <dd className="font-semibold">
                            {selected.process.uniqueBidderCount ?? 'No disponible'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Publicación</dt>
                          <dd className="font-semibold">
                            {displayDate(selected.process.publishedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Adjudicación</dt>
                          <dd className="font-semibold">
                            {displayDate(selected.process.awardedAt)}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-slate-500">Precio base</dt>
                          <dd className="font-semibold">
                            {selected.process.estimatedValue != null
                              ? money.format(selected.process.estimatedValue)
                              : 'No disponible'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-2 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
                        No fue posible vincular este contrato con una fila del
                        conjunto oficial de procesos. No se completan métricas
                        por inferencia.
                      </p>
                    )}
                  </section>
                  <section className="mt-5 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">Documentos oficiales</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800">
                        {selected.documentCount}
                      </span>
                    </div>
                    {selected.documents.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {selected.documents.map((document) => (
                          <li key={document.id}>
                            <a
                              href={document.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl border border-slate-200 p-3 text-xs hover:border-blue-300 hover:bg-blue-50"
                            >
                              <strong className="block break-words text-[#174f8c]">
                                {document.fileName}
                              </strong>
                              <span className="mt-1 block text-[11px] text-slate-500">
                                {(document.extension || 'archivo').toUpperCase()} ·{' '}
                                {displaySize(document.sizeBytes)} ·{' '}
                                {displayDate(document.uploadedAt)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                        No hay documentos inventariados para este contrato.
                      </p>
                    )}
                    {selected.documentCount > selected.documents.length && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Se muestran los {selected.documents.length} más recientes
                        de {selected.documentCount} documentos inventariados.
                      </p>
                    )}
                  </section>
                  <section className="mt-5 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold">Explícame este contrato</h3>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Lectura documental asistida y verificable. No determina
                      irregularidades ni modifica el índice de riesgo.
                    </p>
                    {selected.documentExplanation ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Avance de este contrato</span>
                            <span>
                              {
                                selected.documentExplanation.categories.filter(
                                  (finding) => finding.reviewDecision,
                                ).length
                              }{' '}
                              de {selected.documentExplanation.categories.length}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-cyan-700"
                              style={{
                                width: `${Math.round(
                                  (selected.documentExplanation.categories.filter(
                                    (finding) => finding.reviewDecision,
                                  ).length /
                                    selected.documentExplanation.categories.length) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        {selected.documentExplanation.categories.map((finding) => {
                          const labels = {
                            need: 'Necesidad',
                            justification: 'Justificación jurídica',
                            budget: 'Presupuesto',
                            market: 'Estudio de mercado',
                          };
                          return (
                            <article
                              key={finding.category}
                              className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-cyan-950">
                                  {labels[finding.category]}
                                </strong>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                                  {finding.reviewDecision === 'confirmed'
                                    ? 'Revisión confirmada'
                                    : finding.reviewDecision === 'rejected'
                                      ? 'Revisión rechazada'
                                      : finding.status === 'found'
                                        ? 'Pendiente de revisión'
                                        : 'No encontrado'}
                                </span>
                              </div>
                              {finding.status === 'found' ? (
                                <>
                                  <p className="mt-2 whitespace-pre-line leading-5 text-slate-700">
                                    {finding.excerpt}
                                  </p>
                                  <a
                                    href={finding.sourceUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 block font-bold text-cyan-800 underline underline-offset-2"
                                  >
                                    Documento {finding.documentId} · página{' '}
                                    {finding.pageNumber}
                                  </a>
                                  {finding.reviewNote && (
                                    <p className="mt-2 rounded-lg bg-white p-2 text-[11px] text-slate-600">
                                      Nota de revisión: {finding.reviewNote}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="mt-2 leading-5 text-slate-600">
                                  No se encontró un fragmento explícito en los
                                  documentos analizados. Esto no prueba que la
                                  información no exista en SECOP.
                                </p>
                              )}
                              <label className="mt-3 block border-t border-cyan-200 pt-2 text-[11px] font-bold text-cyan-950">
                                Observación del revisor (opcional)
                                <textarea
                                  maxLength={500}
                                  rows={2}
                                  value={
                                    reviewNotes[
                                      `${selected.id}:${finding.category}`
                                    ] ?? finding.reviewNote ?? ''
                                  }
                                  onChange={(event) =>
                                    setReviewNotes((current) => ({
                                      ...current,
                                      [`${selected.id}:${finding.category}`]:
                                        event.target.value,
                                    }))
                                  }
                                  placeholder="Explica brevemente por qué confirmas o rechazas el resultado"
                                  className="mt-1 block w-full resize-y rounded-lg border border-cyan-200 bg-white p-2 font-normal text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300"
                                />
                              </label>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  disabled={reviewingCategory === finding.category}
                                  onClick={() =>
                                    reviewCitation(finding.category, 'confirmed')
                                  }
                                  className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingCategory === finding.category}
                                  onClick={() =>
                                    reviewCitation(finding.category, 'rejected')
                                  }
                                  className="rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </div>
                            </article>
                          );
                        })}
                        <p className="text-[10px] text-slate-500">
                          Analizador documental v
                          {selected.documentExplanation.analyzerVersion}
                          {' · '}Los resultados pendientes aún no han sido
                          confirmados por una persona.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
                        {selected.documentCount === 0
                          ? 'No hay documentos disponibles en el inventario consultado. Esto no significa que la información contractual no exista en otra fuente.'
                          : 'Hay documentos inventariados, pero este contrato todavía no ha sido analizado. Este estado es distinto de “información no encontrada” después de analizar el texto.'}
                      </p>
                    )}
                  </section>
                  {selected.extractedDocuments.length > 0 && (
                    <section className="mt-5 border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-bold">Texto extraído con citas</h3>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        Fragmentos literales para verificar en el documento; no son
                        una conclusión ni modifican el puntaje de riesgo.
                      </p>
                      <div className="mt-3 space-y-3">
                        {selected.extractedDocuments.map((document) => (
                          <article
                            key={document.id}
                            className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs"
                          >
                            <a
                              href={document.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-violet-900 underline underline-offset-2"
                            >
                              {document.fileName}
                            </a>
                            <p className="mt-1 text-[11px] text-violet-700">
                              {document.pageCount} página(s) ·{' '}
                              {document.textCharCount.toLocaleString('es-CO')} caracteres
                            </p>
                            <div className="mt-2 space-y-2">
                              {document.pages.map((page) => (
                                <blockquote
                                  key={page.pageNumber}
                                  className="rounded-lg border-l-4 border-violet-400 bg-white p-2 leading-5 text-slate-700"
                                >
                                  <strong className="block text-[10px] uppercase tracking-wide text-violet-700">
                                    Documento {document.id} · página {page.pageNumber}
                                  </strong>
                                  <span className="line-clamp-6 whitespace-pre-line">
                                    {page.excerpt}
                                  </span>
                                </blockquote>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                  {selected.riskSignals.length > 0 ? (
                    <section className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-bold">Explicación del riesgo</h3>
                        <RiskBadge value={selected.risk} />
                      </div>
                      <div className="space-y-2">
                        {selected.riskSignals.map((signal) => (
                          <article
                            key={`${signal.code}-${signal.version}`}
                            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong>{signal.code.replaceAll('_', ' ')}</strong>
                              <span className="font-bold">+{signal.score}</span>
                            </div>
                            <p>{signal.evidence?.explanation}</p>
                            <p className="mt-1 text-[11px] text-amber-800">
                              {signal.evidence?.limitation}
                            </p>
                            <p className="mt-1 text-[10px] text-amber-700">
                              Regla v{signal.version}
                            </p>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : (
                    <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                      <strong>Sin señales en el motor v1.</strong> Esto no elimina
                      otros riesgos ni sustituye la revisión humana.
                    </div>
                  )}
                  {selected.sourceUrl && (
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block w-full rounded-xl bg-[#123d70] py-3 text-center text-sm font-bold text-white"
                    >
                      Abrir proceso original en SECOP
                    </a>
                  )}
                  <p className="mt-4 text-[11px] leading-4 text-slate-500">
                    Los datos provienen de SECOP II y deben verificarse en la
                    fuente original.
                  </p>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
