const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export class SocrataClient {
  constructor({ baseUrl, datasetId, appToken = '', fetchImpl = fetch, retries = 4 }) {
    this.endpoint = `${baseUrl.replace(/\/$/, '')}/${datasetId}.json`;
    this.appToken = appToken;
    this.fetchImpl = fetchImpl;
    this.retries = retries;
  }

  buildUrl(query) {
    const url = new URL(this.endpoint);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    return url;
  }

  async fetchPage(query) {
    const url = this.buildUrl(query);
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          headers: this.appToken ? { 'X-App-Token': this.appToken } : {},
          signal: AbortSignal.timeout(60_000),
        });
        if (!response.ok) {
          const body = await response.text();
          const error = new Error(`Socrata respondió ${response.status}: ${body.slice(0, 300)}`);
          error.status = response.status;
          throw error;
        }
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Socrata devolvió una respuesta no esperada.');
        return data;
      } catch (error) {
        lastError = error;
        const retryable = error.name === 'TimeoutError' || error.name === 'AbortError' || RETRYABLE_STATUS.has(error.status);
        if (!retryable || attempt === this.retries) break;
        const delay = Math.min(1_000 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 250);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}

