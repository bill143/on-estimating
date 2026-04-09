import { create } from 'zustand';
import type {
  SettingsTab,
  Integration,
  AIConfig,
  OrganizationProfile,
  User,
  RolePermissionMap,
  SSOConfig,
  AuditLogEntry,
  NotificationSettings,
  EstimatingPreferences,
  DocumentTemplate,
  BillingInfo,
  NotificationMatrix,
  EmailDigestFrequency,
  ExportTemplateSettings,
  ComplianceSettings,
} from '@/lib/settings-types';

// ── Default permission matrix ───────────

const defaultPermissions: RolePermissionMap = {
  super_admin: { takeoff: true, estimates: true, 'bid-tracking': true, 'plan-chat': true, settings: true, reports: true, exports: true },
  org_admin: { takeoff: true, estimates: true, 'bid-tracking': true, 'plan-chat': true, settings: true, reports: true, exports: true },
  estimator: { takeoff: true, estimates: true, 'bid-tracking': true, 'plan-chat': true, settings: false, reports: true, exports: true },
  project_manager: { takeoff: true, estimates: true, 'bid-tracking': true, 'plan-chat': true, settings: false, reports: true, exports: true },
  subcontractor: { takeoff: false, estimates: false, 'bid-tracking': false, 'plan-chat': false, settings: false, reports: false, exports: false },
  viewer: { takeoff: false, estimates: false, 'bid-tracking': false, 'plan-chat': false, settings: false, reports: true, exports: false },
};

// ── Store shape ─────────────────────────

interface SettingsState {
  activeTab: SettingsTab;
  isDirty: boolean;

  // Section data
  integrations: Integration[];
  aiConfig: AIConfig;
  organization: OrganizationProfile;
  users: User[];
  rolePermissions: RolePermissionMap;
  sso: SSOConfig;
  auditLog: AuditLogEntry[];
  notifications: NotificationSettings;
  notificationMatrix: NotificationMatrix;
  emailDigestFrequency: EmailDigestFrequency;
  slackWebhookUrl: string;
  estimating: EstimatingPreferences;
  documents: DocumentTemplate[];
  billing: BillingInfo;
  exportTemplates: ExportTemplateSettings;
  compliance: ComplianceSettings;

  // Actions
  setActiveTab: (tab: SettingsTab) => void;
  markDirty: () => void;
  markClean: () => void;

  setIntegrations: (integrations: Integration[]) => void;
  updateIntegration: (id: string, patch: Partial<Integration>) => void;

  setAIConfig: (config: AIConfig) => void;
  updateAIConfig: (patch: Partial<AIConfig>) => void;

  setOrganization: (org: OrganizationProfile) => void;
  updateOrganization: (patch: Partial<OrganizationProfile>) => void;

  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  setRolePermissions: (permissions: RolePermissionMap) => void;
  setSSO: (sso: SSOConfig) => void;
  setAuditLog: (entries: AuditLogEntry[]) => void;

  setNotifications: (settings: NotificationSettings) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;

  setEstimating: (prefs: EstimatingPreferences) => void;
  updateEstimating: (patch: Partial<EstimatingPreferences>) => void;

  setDocuments: (docs: DocumentTemplate[]) => void;
  addDocument: (doc: DocumentTemplate) => void;
  removeDocument: (id: string) => void;

  setBilling: (billing: BillingInfo) => void;

  setNotificationMatrix: (matrix: NotificationMatrix) => void;
  setEmailDigestFrequency: (freq: EmailDigestFrequency) => void;
  setSlackWebhookUrl: (url: string) => void;
  setExportTemplates: (templates: ExportTemplateSettings) => void;
  updateExportTemplates: (patch: Partial<ExportTemplateSettings>) => void;
  setCompliance: (compliance: ComplianceSettings) => void;
  updateCompliance: (patch: Partial<ComplianceSettings>) => void;
}

// ── Default values ──────────────────────

const defaultAIConfig: AIConfig = {
  primaryEngine: 'claude',
  claudeModel: 'claude-sonnet-4-5',
  gpt4oModel: 'gpt-4o',
  claudeApiKey: '',
  openaiApiKey: '',
  confidenceThreshold: 0.85,
  tokenBudgetPerQuery: 4000,
  temperature: 0.3,
  defaultModels: {
    takeoff: 'claude-sonnet',
    'plan-chat': 'claude-opus',
    estimates: 'claude-sonnet',
    'bid-analysis': 'claude-opus',
  },
  claudeVision: { resolution: 'high', pageLimit: 50, confidenceThreshold: 85 },
  gpt4oFallback: { enabled: true, triggerThreshold: 70 },
  responseVerbosity: 'detailed',
  promptTemplates: [],
  tokenBudgets: {
    super_admin: 1000000,
    org_admin: 1000000,
    estimator: 500000,
    project_manager: 250000,
    subcontractor: 50000,
    viewer: 10000,
  },
  ragContextSize: 128000,
  embeddingModel: 'text-embedding-3-large',
  disagreementThreshold: 15,
  costTracking: { tokensUsed: 0, estimatedCost: 0, monthlyBudget: 500 },
};

const defaultOrganization: OrganizationProfile = {
  name: '',
  address: { street: '', city: '', state: '', zip: '' },
  cageCode: '',
  ueiNumber: '',
  certifications: { eightA: false, sdvosb: false, wosb: false, hubzone: false, sb: false },
  naicsCodes: [],
  primaryNaics: '',
  bonding: { singleJobLimit: 0, aggregateLimit: 0 },
  insuranceCerts: [],
  federalAgencies: [],
  pastPerformanceByAgency: {},
  serviceAreas: [],
};

const defaultNotifications: NotificationSettings = {
  bidDeadlineReminder: { enabled: true, daysBefore: 7 },
  itbCaptureAlerts: true,
  addendumAlerts: true,
  takeoffCompletion: true,
  aiAnomalyAlerts: { enabled: true, thresholdPercent: 20 },
  dailyDigest: true,
  slackRouting: {},
  webhookEndpoints: [],
  automationRules: [],
};

const defaultEstimating: EstimatingPreferences = {
  csiDivisions: [],
  laborRates: [],
  materialCosts: [],
  equipmentRates: [],
  overheadProfitDefaults: { 'design-build': 15, 'bid-build': 10, 'idiq': 12 },
  bondRateTable: [],
  taxRateByState: {},
  contingencyDefaults: { 'design-build': 10, 'bid-build': 5 },
  unitOfMeasure: 'imperial',
  defaultExportFormat: 'both',
  roundingRules: { quantities: 2, costs: 2, totals: 0 },
};

const defaultBilling: BillingInfo = {
  plan: 'starter',
  seatCount: 5,
  seatsUsed: 1,
  apiTokenUsage: { used: 0, limit: 100000 },
  features: {
    'takeoff-pages': { used: 0, limit: 500 },
    'ai-queries': { used: 0, limit: 1000 },
  },
  invoices: [],
  nextBillingDate: '',
  monthlyAmount: 0,
};

// ── Store ───────────────────────────────

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: 'integrations',
  isDirty: false,

  integrations: [],
  aiConfig: defaultAIConfig,
  organization: defaultOrganization,
  users: [],
  rolePermissions: defaultPermissions,
  sso: { google: false, microsoft: false, saml: { enabled: false } },
  auditLog: [],
  notifications: defaultNotifications,
  notificationMatrix: {
    'estimate-submitted': { 'in-app': true, email: true, slack: false },
    'estimate-approved': { 'in-app': true, email: true, slack: true },
    'estimate-rejected': { 'in-app': true, email: true, slack: false },
    'project-created': { 'in-app': true, email: false, slack: false },
    'bid-deadline': { 'in-app': true, email: true, slack: true },
    'session-submitted': { 'in-app': true, email: false, slack: false },
    'document-uploaded': { 'in-app': true, email: false, slack: false },
  },
  emailDigestFrequency: 'daily' as const,
  slackWebhookUrl: '',
  estimating: defaultEstimating,
  documents: [],
  billing: defaultBilling,
  exportTemplates: {
    companyName: '',
    logoPlaceholder: true,
    addressBlock: '',
    coverPage: true,
    includeAIConfidence: true,
    includeCsiBreakdown: true,
    includeMarkupDetail: true,
    pageSize: 'letter',
    fontSize: 11,
    draftWatermark: 'DRAFT',
  },
  compliance: {
    prevailingWageEnabled: true,
    samExclusionCheck: true,
    certifications: { sdvosb: true, eightA: false, wosb: false, hubzone: false, small: true },
    defaultSetAside: 'SDVOSB',
    naicsCodes: ['236220', '238210', '238220'],
    cageCode: '',
    ueiNumber: '',
    samExpiryDate: '',
    em385Compliance: true,
    davisBaconState: '',
    davisBaconCounty: '',
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  setIntegrations: (integrations) => set({ integrations }),
  updateIntegration: (id, patch) =>
    set((s) => ({
      integrations: s.integrations.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      isDirty: true,
    })),

  setAIConfig: (aiConfig) => set({ aiConfig }),
  updateAIConfig: (patch) =>
    set((s) => ({ aiConfig: { ...s.aiConfig, ...patch }, isDirty: true })),

  setOrganization: (organization) => set({ organization }),
  updateOrganization: (patch) =>
    set((s) => ({ organization: { ...s.organization, ...patch }, isDirty: true })),

  setUsers: (users) => set({ users }),
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
  updateUser: (id, patch) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    })),
  setRolePermissions: (rolePermissions) => set({ rolePermissions }),
  setSSO: (sso) => set({ sso }),
  setAuditLog: (auditLog) => set({ auditLog }),

  setNotifications: (notifications) => set({ notifications }),
  updateNotifications: (patch) =>
    set((s) => ({ notifications: { ...s.notifications, ...patch }, isDirty: true })),

  setEstimating: (estimating) => set({ estimating }),
  updateEstimating: (patch) =>
    set((s) => ({ estimating: { ...s.estimating, ...patch }, isDirty: true })),

  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  setBilling: (billing) => set({ billing }),

  setNotificationMatrix: (notificationMatrix) => set({ notificationMatrix, isDirty: true }),
  setEmailDigestFrequency: (emailDigestFrequency) => set({ emailDigestFrequency, isDirty: true }),
  setSlackWebhookUrl: (slackWebhookUrl) => set({ slackWebhookUrl, isDirty: true }),
  setExportTemplates: (exportTemplates) => set({ exportTemplates }),
  updateExportTemplates: (patch) =>
    set((s) => ({ exportTemplates: { ...s.exportTemplates, ...patch }, isDirty: true })),
  setCompliance: (compliance) => set({ compliance }),
  updateCompliance: (patch) =>
    set((s) => ({ compliance: { ...s.compliance, ...patch }, isDirty: true })),
}));
