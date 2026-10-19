export type AdapterState = {
  provider: string;
  configured: boolean;
  message: string;
};

export type AdapterRequest = {
  projectId: number;
  projectName: string;
  files: Array<{ path: string; content: string }>;
};

type AdapterResponse = {
  status: "ready" | "pending" | "blocked";
  provider: string;
  publicUrl?: string;
  artifactUrl?: string;
  logs?: string[];
  blocker?: string;
};

const configured = (key: string) => Boolean(process.env[key]?.trim());
const authHeaders = (token: string) => ({ "content-type": "application/json", authorization: `Bearer ${token}` });

async function callAdapter(url: string, token: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, { method: "POST", headers: authHeaders(token), body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try { data = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { data = { message: text.slice(0, 500) }; }
  return { ok: response.ok, data };
}

const normalizedStatus = (value: unknown, fallback: AdapterResponse["status"]): AdapterResponse["status"] => value === "ready" || value === "pending" || value === "blocked" ? value : fallback;

export const deploymentAdapter = {
  state(): AdapterState {
    const ready = configured("WEB_PUBLISH_PROVIDER_URL") && configured("WEB_PUBLISH_PROVIDER_TOKEN");
    return { provider: process.env.WEB_PUBLISH_PROVIDER || "Vercel / Cloudflare adapter", configured: ready, message: ready ? "Deployment provider is configured and ready." : "Set WEB_PUBLISH_PROVIDER_URL and WEB_PUBLISH_PROVIDER_TOKEN to enable real deployments." };
  },
  async publish(request: AdapterRequest): Promise<AdapterResponse> {
    const state = this.state();
    if (!state.configured) return { status: "blocked", provider: state.provider, blocker: state.message };
    try {
      const result = await callAdapter(process.env.WEB_PUBLISH_PROVIDER_URL!, process.env.WEB_PUBLISH_PROVIDER_TOKEN!, { action: "publish", ...request });
      const data = result.data;
      if (!result.ok) return { status: "blocked", provider: state.provider, logs: [`provider http ${String(data.status ?? "error")}`, String(data.message ?? "Provider rejected the deployment")], blocker: String(data.message ?? "Provider rejected the deployment") };
      return { status: normalizedStatus(data.status, data.publicUrl || data.url ? "ready" : "pending"), provider: state.provider, publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : typeof data.url === "string" ? data.url : undefined, logs: Array.isArray(data.logs) ? data.logs.map(String) : ["Provider accepted the deployment request."] };
    } catch (error) {
      return { status: "blocked", provider: state.provider, blocker: error instanceof Error ? error.message : "Deployment provider request failed" };
    }
  },
};

export const domainAdapter = {
  state(): AdapterState {
    const ready = configured("DOMAIN_PROVIDER_URL") && configured("DOMAIN_PROVIDER_TOKEN");
    return { provider: process.env.DOMAIN_PROVIDER || "Cloudflare DNS adapter", configured: ready, message: ready ? "DNS provider is configured and ready for verification polling." : "Set DOMAIN_PROVIDER_URL and DOMAIN_PROVIDER_TOKEN to enable DNS verification." };
  },
  async verify(hostname: string): Promise<AdapterResponse & { hostname: string }> {
    const state = this.state();
    if (!state.configured) return { status: "blocked", provider: state.provider, hostname, blocker: state.message };
    try {
      const result = await callAdapter(process.env.DOMAIN_PROVIDER_URL!, process.env.DOMAIN_PROVIDER_TOKEN!, { action: "verify", hostname });
      const data = result.data;
      if (!result.ok) return { status: "blocked", provider: state.provider, hostname, blocker: String(data.message ?? "DNS provider rejected the request") };
      return { status: normalizedStatus(data.status, "pending"), provider: state.provider, hostname, publicUrl: typeof data.sslUrl === "string" ? data.sslUrl : undefined, logs: Array.isArray(data.logs) ? data.logs.map(String) : ["DNS verification request accepted."] };
    } catch (error) {
      return { status: "blocked", provider: state.provider, hostname, blocker: error instanceof Error ? error.message : "DNS provider request failed" };
    }
  },
};

export const androidAdapter = {
  state(): AdapterState {
    const ready = configured("ANDROID_BUILD_PROVIDER_URL") && configured("ANDROID_BUILD_PROVIDER_TOKEN");
    return { provider: process.env.ANDROID_BUILD_PROVIDER || "Isolated Android build adapter", configured: ready, message: ready ? "Android worker is configured; signing credentials are supplied per build." : "Set ANDROID_BUILD_PROVIDER_URL and ANDROID_BUILD_PROVIDER_TOKEN to enable APK/AAB builds." };
  },
  async build(request: { projectId: number; kind: "apk" | "aab"; packageName: string; version: string; files: Array<{ path: string; content: string }> }): Promise<AdapterResponse> {
    const state = this.state();
    if (!state.configured) return { status: "blocked", provider: state.provider, blocker: state.message };
    try {
      const result = await callAdapter(process.env.ANDROID_BUILD_PROVIDER_URL!, process.env.ANDROID_BUILD_PROVIDER_TOKEN!, { action: "build", ...request });
      const data = result.data;
      if (!result.ok) return { status: "blocked", provider: state.provider, logs: [`provider http ${String(data.status ?? "error")}`], blocker: String(data.message ?? "Android worker rejected the build") };
      return { status: normalizedStatus(data.status, data.artifactUrl ? "ready" : "pending"), provider: state.provider, artifactUrl: typeof data.artifactUrl === "string" ? data.artifactUrl : undefined, logs: Array.isArray(data.logs) ? data.logs.map(String) : ["Android worker accepted the build request."] };
    } catch (error) {
      return { status: "blocked", provider: state.provider, blocker: error instanceof Error ? error.message : "Android provider request failed" };
    }
  },
};
