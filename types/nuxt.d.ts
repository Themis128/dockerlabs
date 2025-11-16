/**
 * Type declarations for Nuxt auto-imports
 * These functions are auto-imported by Nuxt but TypeScript needs explicit declarations
 */

declare global {
  function useRuntimeConfig(): {
    public: {
      apiBase?: string;
      pythonServerUrl?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };

  function $fetch<T = any>(
    url: string,
    options?: {
      method?: string;
      body?: any;
      headers?: HeadersInit;
      [key: string]: any;
    }
  ): Promise<T>;
}

export {};
