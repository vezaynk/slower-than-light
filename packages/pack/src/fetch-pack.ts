/** Downloads pack XML and reports how much of the body has arrived, from 0 to 1. */
export async function fetchPackXml(
  url: string,
  onProgress: (ratio: number) => void,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  onProgress(0);
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`pack ${res.status}`);
  const body = res.body;
  if (!body) {
    const text = await res.text();
    onProgress(1);
    return text;
  }
  const total = Number(res.headers.get("content-length"));
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  onProgress(1);
  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}
