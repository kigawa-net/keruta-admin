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
  repositoryUrl?: string | null;
  repositoryRef: string;
  templateConfig?: SessionTemplateConfig | null;
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

// Coder Workspace Types (Updated for Coder API proxy)
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  templateId: string;
  templateName: string;
  status: string;
  health: string;
  accessUrl?: string | null;
  autoStart: boolean;
  ttlMs: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sessionId?: string | null;
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
  repositoryUrl?: string;
  repositoryRef: string;
  templateConfig?: SessionTemplateConfig;
}

export interface SessionTemplateConfig {
  templateId: string | null;
  templateName: string | null;
  templatePath: string;
  preferredKeywords: string[];
  parameters: Record<string, string>;
}

// Coder Workspace Form Types (Updated for Coder API proxy)
export interface CreateWorkspaceData {
  name: string;
  templateId: string;
  ownerId: string;
  ownerName: string;
  sessionId: string;
  ttlMs?: number;
  autoStart?: boolean;
  parameters?: Record<string, string>;
}

export interface UpdateWorkspaceData {
  name: string;
  ownerId: string;
  ownerName: string;
  templateId: string;
  ttlMs?: number;
  autoStart?: boolean;
  parameters?: Record<string, string>;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  icon?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Task Types
export interface Task {
  id: string;
  sessionId: string;
  parentTaskId?: string | null;
  name: string;
  description: string;
  script: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ERROR' | string;
  message: string;
  progress: number;
  errorCode: string;
  parameters: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  subTasks?: Task[];
}

// Task Log Types
export interface TaskLog {
  id: string;
  taskId: string;
  sessionId: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface CreateTaskLogData {
  level: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

// Session Log Types
export interface SessionLog {
  id: string;
  sessionId: string;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  source: string;
  action: string;
  message: string;
  details?: string | null;
  metadata: Record<string, any>;
  userId?: string | null;
  timestamp: string;
}

export interface CreateSessionLogData {
  level: string;
  source: string;
  action: string;
  message: string;
  details?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

