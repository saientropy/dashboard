// Placeholder Orangetheory client. Replace endpoints/selectors with working implementation.
export type OtfClass = {
  id: number;
  start: string; // ISO
  end: string;   // ISO
  avgHr?: number;
  maxHr?: number;
};

export async function fetchRecentClasses(username: string, password: string): Promise<OtfClass[]> {
  // Implement login/session and pull recent classes.
  // Return minimal fields used by persistence.
  return [];
}


