const MAX_DEPTH = 8;

export function sanitizeTelemetryText(value) {
  return String(value)
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[CORREO OMITIDO]')
    .replace(/\bCO1\.[A-Z]+\.\d+\b/gi, '[IDENTIFICADOR SECOP OMITIDO]')
    .replace(/\b\d{7,}\b/g, '[NÚMERO OMITIDO]')
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+/gi, '[RUTA LOCAL OMITIDA]')
    .replace(/data[\\/]documents[\\/][^\s"']+/gi, '[RUTA DOCUMENTAL OMITIDA]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/gi, '$1?[CONSULTA OMITIDA]');
}

function scrub(value, depth = 0) {
  if (depth > MAX_DEPTH) return '[CONTEXTO OMITIDO]';
  if (typeof value === 'string') return sanitizeTelemetryText(value);
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, scrub(item, depth + 1)]),
  );
}

export function sanitizeSentryEvent(event) {
  const safe = scrub(event);
  delete safe.user;
  delete safe.request;
  delete safe.extra;
  delete safe.modules;
  delete safe.server_name;
  safe.breadcrumbs = [];
  if (safe.contexts) {
    safe.contexts = Object.fromEntries(
      Object.entries(safe.contexts).filter(([key]) =>
        ['browser', 'device', 'os', 'runtime'].includes(key),
      ),
    );
  }
  return safe;
}
