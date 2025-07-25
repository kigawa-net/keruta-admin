/**
 * Type definitions for Keruta Admin
 */

// Session Types
export interface TerraformTemplateConfig {
  templatePath: string;
  storageClassName?: string;
  storageSize?: string;
  mountPath?: string;
  variables: Record<string, string>;
  enabled: boolean;
  claudeCodeConfig?: ClaudeCodeConfig;
}

export interface ClaudeCodeConfig {
  enabled: boolean;
  apiKey?: string;
  nodeVersion?: string;
}

export interface Session {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  tags: string[];
  metadata: Record<string, string>;
  terraformTemplateConfig?: TerraformTemplateConfig | null;
  createdAt: string;
  updatedAt: string;
}

// Coder Template Types
export interface CoderTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  defaultTtlMs: number;
  maxTtlMs: number;
  minAutostartIntervalMs: number;
  createdByName: string;
  updatedAt: string;
  organizationId: string;
  provisioner: string;
  activeVersionId: string;
  workspaceCount: number;
}

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  sessionId: string;
  templateId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
  resourceInfo?: WorkspaceResourceInfo | null;
}

export interface WorkspaceResourceInfo {
  kubernetesNamespace: string;
  persistentVolumeClaimName: string;
  podName?: string;
  serviceName?: string;
  ingressUrl?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Template Types
export interface Template {
  id: string;
  name: string;
  description: string;
  path: string;
  content: string;
  lastModified: string;
  status: "active" | "draft" | "error";
}

// Form Types
export interface SessionFormData {
  name: string;
  description?: string;
  status: string;
  tags: string[];
  metadata: Record<string, string>;
  templateConfig?: SessionTemplateConfig;
}

export interface SessionTemplateConfig {
  templateId: string | null;
  templateName: string | null;
  repositoryUrl: string | null;
  repositoryRef: string;
  templatePath: string;
  preferredKeywords: string[];
  parameters: Record<string, string>;
}