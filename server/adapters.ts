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

const configured = (key: string) => Boolean(process.env[key]?.trim());

export const deploymentAdapter = {
  state(): AdapterState {
    return {
      provider: process.env.WEB_PUBLISH_PROVIDER || "Vercel / Cloudflare adapter",
      configured: configured("WEB_PUBLISH_PROVIDER_URL") && configured("WEB_PUBLISH_PROVIDER_TOKEN"),
      message: configured("WEB_PUBLISH_PROVIDER_URL") && configured("WEB_PUBLISH_PROVIDER_TOKEN")
        ? "Deployment provider is configured and ready for a real adapter call."
        : "Set WEB_PUBLISH_PROVIDER_URL and WEB_PUBLISH_PROVIDER_TOKEN to enable real deployments.",
    };
  },
  async publish(_request: AdapterRequest) {
    const state = this.state();
    if (!state.configured) return { status: "blocked" as const, provider: state.provider, blocker: state.message };
    return { status: "blocked" as const, provider: state.provider, blocker: "Provider adapter is configured but its project-specific deployment contract still needs to be mapped." };
  },
};

export const domainAdapter = {
  state(): AdapterState {
    return {
      provider: process.env.DOMAIN_PROVIDER || "Cloudflare DNS adapter",
      configured: configured("DOMAIN_PROVIDER_URL") && configured("DOMAIN_PROVIDER_TOKEN"),
      message: configured("DOMAIN_PROVIDER_URL") && configured("DOMAIN_PROVIDER_TOKEN")
        ? "DNS provider is configured and ready for verification polling."
        : "Set DOMAIN_PROVIDER_URL and DOMAIN_PROVIDER_TOKEN to enable DNS verification.",
    };
  },
  async verify(hostname: string) {
    const state = this.state();
    if (!state.configured) return { status: "blocked" as const, provider: state.provider, hostname, blocker: state.message };
    return { status: "pending" as const, provider: state.provider, hostname, blocker: "DNS challenge adapter is configured but verification polling is not running." };
  },
};

export const androidAdapter = {
  state(): AdapterState {
    return {
      provider: process.env.ANDROID_BUILD_PROVIDER || "Isolated Android build adapter",
      configured: configured("ANDROID_BUILD_PROVIDER_URL") && configured("ANDROID_BUILD_PROVIDER_TOKEN"),
      message: configured("ANDROID_BUILD_PROVIDER_URL") && configured("ANDROID_BUILD_PROVIDER_TOKEN")
        ? "Android worker is configured; signing credentials are still required per build."
        : "Set ANDROID_BUILD_PROVIDER_URL and ANDROID_BUILD_PROVIDER_TOKEN to enable APK/AAB builds.",
    };
  },
  async build() {
    const state = this.state();
    if (!state.configured) return { status: "blocked" as const, provider: state.provider, blocker: state.message };
    return { status: "blocked" as const, provider: state.provider, blocker: "Android adapter is configured but signing credentials are not present for this build." };
  },
};
