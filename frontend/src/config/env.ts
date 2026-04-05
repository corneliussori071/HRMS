interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvConfig(): EnvConfig {
  return {
    supabaseUrl: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    appUrl: getEnvVar("NEXT_PUBLIC_APP_URL"),
  };
}

export const APP_NAME = "HRMS";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
