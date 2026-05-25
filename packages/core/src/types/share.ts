export interface ShareData {
  toolId: string;
  content: unknown;
  metadata?: {
    title?: string;
    description?: string;
    schemaVersion: string;
  };
}

export interface ShareResult {
  id: string;
  url: string;
  createdAt: string;
}
