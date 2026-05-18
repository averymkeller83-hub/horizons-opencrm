export type HorizonsConfig = {
  business: { name: string; timezone: string };
  modules: Record<string, boolean>;
  integrations: {
    googleSheets?: { enabled: boolean; syncDirection?: "import-export" | "bidirectional" };
  };
  storage: {
    driver: "better-sqlite3" | "d1";
    path?: string;
  };
};

const config: HorizonsConfig = {
  business: {
    name: "Sample Business",
    timezone: "America/Indianapolis",
  },
  modules: {
    pipeline: true,
    jobs: false,
    orders: false,
    subscriptions: false,
    supportTickets: false,
  },
  integrations: {},
  storage: {
    driver: "better-sqlite3",
    path: "./data/horizons.db",
  },
};

export default config;
