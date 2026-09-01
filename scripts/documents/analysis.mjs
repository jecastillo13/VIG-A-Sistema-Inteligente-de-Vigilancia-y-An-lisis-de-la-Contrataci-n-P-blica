export const ANALYZER_VERSION = '1.1.0';

export const DOCUMENT_CATEGORIES = [
  { key: 'need', label: 'Necesidad', terms: ['definición de la necesidad', 'descripción de la necesidad', 'necesidad que la entidad pretende satisfacer', 'necesidad'] },
  { key: 'justification', label: 'Justificación jurídica', terms: ['fundamentos jurídicos', 'fundamento jurídico', 'justificación', 'conveniencia y oportunidad', 'se requiere contratar', 'requiere contratar'] },
  { key: 'budget', label: 'Presupuesto', terms: ['presupuesto oficial', 'disponibilidad presupuestal', 'valor estimado', 'presupuesto', 'forma de pago'] },
  { key: 'market', label: 'Estudio de mercado', terms: ['estudio de mercado', 'análisis del sector', 'analisis del sector', 'cotizaciones', 'precios del mercado'] },
];

function comparable(value) {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

export function excerptAround(text, index, termLength, maximum = 600) {
  const source = String(text);
  let start = Math.max(0, index - 140);
  let end = Math.min(source.length, index + termLength + 360);
  const previousBreak = source.lastIndexOf('\n', index);
  if (previousBreak >= start) start = previousBreak + 1;
  const nextBreak = source.indexOf('\n', index + termLength);
  if (nextBreak !== -1 && nextBreak <= end) end = nextBreak;
  let excerpt = source.slice(start, end).replace(/[ \t]{2,}/g, ' ').trim();
  if (excerpt.length < 100) excerpt = source.slice(Math.max(0, index - 80), Math.min(source.length, index + termLength + 300)).replace(/[ \t]{2,}/g, ' ').trim();
  return excerpt.slice(0, maximum);
}

export function analyzePages(documents) {
  return DOCUMENT_CATEGORIES.map((category) => {
    for (const term of category.terms) {
      const normalizedTerm = comparable(term);
      for (const document of documents) {
        for (const page of document.pages) {
          const normalizedText = comparable(page.text);
          const index = normalizedText.indexOf(normalizedTerm);
          if (index !== -1) {
            return {
              category: category.key,
              label: category.label,
              status: 'found',
              documentId: document.id,
              fileName: document.fileName,
              sourceUrl: document.sourceUrl,
              pageNumber: page.pageNumber,
              excerpt: excerptAround(page.text, index, term.length),
              matchedTerm: term,
            };
          }
        }
      }
    }
    return { category: category.key, label: category.label, status: 'not_found' };
  });
}
