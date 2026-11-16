// Fetch YouTube audio into the browser, on-device. Nothing the user owns is
// uploaded anywhere: we resolve the video's audio streams through public
// Piped API instances, then download the chosen stream straight to a Blob.
// Public instances come and go, so several are tried in order.

const PIPED_API_HOSTS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.r4fo.com",
  "https://pipedapi.qdi.fi",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.smnz.de",
  "https://api-piped.mha.fi",
];

const FETCH_TIMEOUT_MS = 15000;

interface PipedAudioStream {
  url?: string;
  codec?: string;
  bitrate?: number;
}

interface PipedStreamsResponse {
  audioStreams?: PipedAudioStream[];
  title?: string;
}

async function fetchJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Pick the best audio-only stream: m4a first (broad decode support), then bitrate.
 * Exported for unit tests.
 */
export function pickAudioStream(streams: PipedAudioStream[]): PipedAudioStream | null {
  const usable = streams.filter((s) => typeof s.url === "string" && s.url.length > 0);
  if (usable.length === 0) return null;
  const scored = usable.map((s) => {
    const codec = (s.codec ?? "").toLowerCase();
    const container = codec.includes("mp4a") || codec.includes("m4a")
      ? 2
      : codec.includes("opus") || codec.includes("webm")
        ? 1
        : 0;
    return { s, score: container * 1_000_000 + (s.bitrate ?? 0) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].s;
}

export interface YtFetchResult {
  file: File;
  title: string | null;
}

async function tryPipedHost(base: string, videoId: string): Promise<YtFetchResult> {
  const data = (await fetchJson(
    `${base}/streams/${encodeURIComponent(videoId)}`
  )) as PipedStreamsResponse;
  const picked = pickAudioStream(data.audioStreams ?? []);
  if (!picked?.url) throw new Error("no audio streams");
  const audioRes = await fetch(picked.url);
  if (!audioRes.ok) throw new Error(`audio HTTP ${audioRes.status}`);
  const blob = await audioRes.blob();
  if (blob.size === 0) throw new Error("empty audio response");
  const isOpus = (picked.codec ?? "").toLowerCase().includes("opus");
  const ext = isOpus ? "webm" : "m4a";
  return {
    file: new File([blob], `youtube-${videoId}.${ext}`, {
      type: isOpus ? "audio/webm" : "audio/mp4",
    }),
    title: data.title ?? null,
  };
}

/**
 * Resolve `videoId` to an audio File. `bases` overrides the instance list
 * (E2E seam — `window.__YT_API_HOSTS` also works); first healthy host wins.
 * Throws with a human-readable reason when every host fails.
 */
export async function fetchYouTubeAudio(
  videoId: string,
  bases?: string[]
): Promise<YtFetchResult> {
  const hosts =
    bases ??
    (typeof window !== "undefined" &&
    Array.isArray((window as unknown as { __YT_API_HOSTS?: unknown }).__YT_API_HOSTS)
      ? ((window as unknown as { __YT_API_HOSTS: string[] }).__YT_API_HOSTS as string[])
      : PIPED_API_HOSTS);
  const errors: string[] = [];
  for (const base of hosts) {
    try {
      return await tryPipedHost(base, videoId);
    } catch (e) {
      errors.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(
    `Couldn't reach any audio service (${errors.length} tried). Check connection / try again — or upload the audio file directly.`
  );
}
