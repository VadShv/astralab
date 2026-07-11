import type { PromptContent, PromptVariable, ModelConfig } from "@/lib/prompt";

export interface SeedPrompt {
  name: string;
  description: string;
  tags: string[];
  defaultModel: string;
  category: string;
  /** Main-branch version content. */
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
  commitMessage: string;
  /** Optional second version on a branch for richer DAG. */
  variant?: {
    branch: string;
    commitMessage: string;
    content: PromptContent;
    variables?: PromptVariable[];
    modelConfig?: ModelConfig;
  };
}

export const DEFAULT_CONFIG: ModelConfig = {
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 1200,
};

/** Aggregated registry — populated by category modules. */
export const ALL_PROMPTS: SeedPrompt[] = [];
