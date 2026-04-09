// ── Settings Module Types ─────────────────

export type Verbosity = 'concise' | 'detailed' | 'verbose' | 'expert' | string;
export type ClaudeModel = string;
export type GPT4oModel = string;

// ── Additional types used by settings tabs ──

export type PlanTier = 'starter' | 'professional' | 'enterprise' | string;

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  downloadUrl: string;
}

export type NotificationEvent = string;
export type NotificationChannel = 'in-app' | 'email' | 'slack';

export interface InsuranceCert {
  id: string;
  type?: string;
  name?: string;
  carrier?: string;
  policyNumber?: string;
  expiryDate: string;
  coverageAmount?: number;
  fileUrl?: string;
  [key: string]: unknown;
}

export interface CSIDivision {
  code: string;
  name: string;
  enabled: boolean;
}

export type UserRole = 'super_admin' | 'org_admin' | 'estimator' | 'project_manager' | 'subcontractor' | 'viewer' | string;
export type Permission = 'takeoff' | 'estimates' | 'bid-tracking' | 'plan-chat' | 'settings' | 'reports' | 'exports' | string;

export type IntegrationCategory = 'ai' | 'database' | 'storage' | 'email' | 'project-management' | 'crm' | 'measurement' | 'accounting' | string;
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'testing' | string;

export interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'toggle' | string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: string | number | boolean;
  [k: string]: unknown;
}

// ── Core Settings Types ───────────────────

export type SettingsTab =
  | 'organization'
  | 'user-management'
  | 'ai-configuration'
  | 'integrations'
  | 'estimating'
  | 'notifications'
  | 'documents'
  | 'billing'
  | 'echo';

export interface Integration {
  id: string;
  name: string;
  provider?: string;
  status: ConnectionStatus;
  enabled?: boolean;
  config?: Record<string, unknown>;
  connectedAt?: string;
  category: IntegrationCategory;
  description: string;
  icon?: string;
  fields: IntegrationField[];
  lastSync?: string;
  docsUrl?: string;
  color?: string;
  errorMessage?: string;
}

export interface AIConfig {
  primaryEngine: string;
  claudeModel: string;
  gpt4oModel: string;
  claudeApiKey: string;
  openaiApiKey: string;
  confidenceThreshold: number;
  tokenBudgetPerQuery: number;
  temperature: number;
  defaultModels: Record<string, string>;
  claudeVision: { resolution: string; pageLimit: number; confidenceThreshold: number };
  gpt4oFallback: { enabled: boolean; triggerThreshold: number };
  responseVerbosity: string;
  promptTemplates: unknown[];
  tokenBudgets: Record<string, number>;
  ragContextSize: number;
  embeddingModel: string;
  disagreementThreshold: number;
  costTracking: { tokensUsed: number; estimatedCost: number; monthlyBudget: number };
}

export interface OrganizationProfile {
  name: string;
  address: { street: string; city: string; state: string; zip: string };
  cageCode: string;
  ueiNumber: string;
  certifications: { eightA: boolean; sdvosb: boolean; wosb: boolean; hubzone: boolean; sb: boolean };
  naicsCodes: string[];
  primaryNaics: string;
  bonding: { singleJobLimit: number; aggregateLimit: number };
  insuranceCerts: InsuranceCert[];
  federalAgencies: string[];
  pastPerformanceByAgency: Record<string, unknown>;
  serviceAreas: string[];
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'invited' | 'disabled' | string;
  avatar?: string;
  joinedAt?: string;
  lastActive?: string;
  mfaEnabled?: boolean;
  [key: string]: unknown;
}

export type RolePermissionMap = Record<string, Record<string, boolean>>;

export interface SSOConfig {
  google: boolean;
  microsoft: boolean;
  saml: { enabled: boolean; entityId?: string; ssoUrl?: string; entryPoint?: string; cert?: string; [key: string]: unknown };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  details?: string;
}

export interface NotificationSettings {
  bidDeadlineReminder: { enabled: boolean; daysBefore: number };
  itbCaptureAlerts: boolean;
  addendumAlerts: boolean;
  takeoffCompletion: boolean;
  aiAnomalyAlerts: { enabled: boolean; thresholdPercent: number };
  dailyDigest: boolean;
  slackRouting: Record<string, string>;
  webhookEndpoints: unknown[];
  automationRules: unknown[];
}

export type NotificationMatrix = Record<string, Record<string, boolean>>;
export type EmailDigestFrequency = 'realtime' | 'daily' | 'weekly' | 'none' | 'immediate' | string;

export interface EstimatingPreferences {
  csiDivisions: CSIDivision[];
  laborRates: unknown[];
  materialCosts: unknown[];
  equipmentRates: unknown[];
  overheadProfitDefaults: Record<string, number>;
  bondRateTable: unknown[];
  taxRateByState: Record<string, number>;
  contingencyDefaults: Record<string, number>;
  unitOfMeasure: 'imperial' | 'metric';
  defaultExportFormat: string;
  roundingRules: { quantities: number; costs: number; totals: number };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  format: string;
  size?: number;
  uploadedAt: string;
  url?: string;
}

export interface BillingInfo {
  plan: string;
  seatCount: number;
  seatsUsed: number;
  apiTokenUsage: { used: number; limit: number };
  features: Record<string, { used: number; limit: number }>;
  invoices: Invoice[];
  nextBillingDate: string;
  monthlyAmount: number;
  paymentMethod?: { type: string; last4: string; expiry: string };
  [key: string]: unknown;
}

export interface ExportTemplateSettings {
  companyName: string;
  logoPlaceholder: boolean;
  addressBlock: string;
  coverPage: boolean;
  includeAIConfidence: boolean;
  includeCsiBreakdown: boolean;
  includeMarkupDetail: boolean;
  pageSize: 'letter' | 'legal' | 'a4';
  fontSize: number;
  draftWatermark: string;
}

export interface ComplianceSettings {
  prevailingWageEnabled: boolean;
  samExclusionCheck: boolean;
  certifications: { sdvosb: boolean; eightA: boolean; wosb: boolean; hubzone: boolean; small: boolean };
  defaultSetAside: string;
  naicsCodes: string[];
  cageCode: string;
  ueiNumber: string;
  samExpiryDate: string;
  em385Compliance: boolean;
  davisBaconState: string;
  davisBaconCounty: string;
}
