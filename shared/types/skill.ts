export interface SkillMetadata {
  author: string;
  version: string;
  description: string;
  tags: string[];
  category: string;
}

export interface Skill {
  id: number;
  name: string;
  slug: string;
  description: string;
  metadata: SkillMetadata;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
