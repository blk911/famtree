declare module "playwright" {
  export const chromium: {
    launch: (options?: { headless?: boolean }) => Promise<{
      newPage: () => Promise<{
        goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
        waitForTimeout: (ms: number) => Promise<void>;
        evaluate: <T>(fn: () => T) => Promise<T>;
        content: () => Promise<string>;
        close: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }>;
  };
}
