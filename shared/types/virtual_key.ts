export interface VirtualKey {
  id: number;
  key: string;
  name: string;
  team?: string;
  enabled: boolean;
  spend?: number;
  budgetLimit?: number;
  tpm?: number;
  rpm?: number;
  models?: string[];
  createdAt?: Date;
}
