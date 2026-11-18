import { createClient } from "redis";
import { Logger } from "../Helpers/Logger.ts";
import { CONSTANTS } from "../utils.ts";

const enabled = process.env.ENABLE_REDIS === "true";

class CacheProvider {
  private static instance: CacheProvider;
  private client: ReturnType<typeof createClient> | null = null;
  private connection: Promise<ReturnType<typeof createClient>> | null = null;

  static getInstance(): CacheProvider {
    return (CacheProvider.instance ??= new CacheProvider());
  }

  private connect(): Promise<ReturnType<typeof createClient>> {
    if (this.connection) return this.connection;
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        connectTimeout: 1500,
        reconnectStrategy: false,
      },
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
    });
    client.on("error", (error) => Logger.warn(`Redis: ${error.message}`));
    this.connection = client.connect().then(() => {
      this.client = client;
      return client;
    }).catch((error) => {
      this.connection = null;
      throw error;
    });
    return this.connection;
  }

  async get(key: string): Promise<string | undefined> {
    if (!enabled) return undefined;
    try {
      return (await (await this.connect()).get(key)) ?? undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!enabled) return;
    try {
      await (await this.connect()).set(key, value, { PX: CONSTANTS.REDIS_TTL });
    } catch (error) {
      Logger.warn(`Redis cache write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!enabled) return;
    try {
      await (await this.connect()).del(key);
    } catch {
      // Cache failures must not fail SVG generation.
    }
  }
}

export const cacheProvider = CacheProvider.getInstance();
