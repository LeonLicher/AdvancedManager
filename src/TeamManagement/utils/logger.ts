/**
 * Logger utility for consistent logging across modules
 */

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warning: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Create a logger instance with a specific module prefix
 */
export function getLogger(moduleName: string): Logger {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[INFO][${moduleName}] ${message}`, ...args);
    },
    warning: (message: string, ...args: any[]) => {
      console.warn(`[WARNING][${moduleName}] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[ERROR][${moduleName}] ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      console.debug(`[DEBUG][${moduleName}] ${message}`, ...args);
    },
  };
}
