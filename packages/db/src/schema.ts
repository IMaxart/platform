import { relations } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ── Auth tables (better-auth) ──

export const users = pgTable('users', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  id: text('id').primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const twoFactors = pgTable(
  'two_factors',
  {
    backupCodes: text('backup_codes').notNull(),
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('two_factors_secret_idx').on(table.secret),
    index('two_factors_user_id_idx').on(table.userId),
  ],
)

export const sessions = pgTable('sessions', {
  activeOrganizationId: text('active_organization_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  ipAddress: text('ip_address'),
  token: text('token').notNull().unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('accounts', {
  accessToken: text('access_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  accountId: text('account_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  password: text('password'),
  providerId: text('provider_id').notNull(),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const verifications = pgTable('verifications', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  value: text('value').notNull(),
})

export const passkeys = pgTable('passkeys', {
  backedUp: boolean('backed_up'),
  counter: integer('counter').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  deviceType: text('device_type'),
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  transports: text('transports'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  webauthnUserID: text('webauthn_user_id').notNull(),
})

export const organizations = pgTable('organizations', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text('id').primaryKey(),
  logo: text('logo'),
  metadata: text('metadata'),
  name: text('name').notNull(),
  slug: text('slug').unique(),
})

export const members = pgTable('members', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const invitations = pgTable('invitations', {
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role'),
  status: text('status').notNull(),
})

// ── Projects (containers for services) ──

export const projects = pgTable('projects', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: uuid('id').primaryKey().defaultRandom(),
  image: text('image'),
  name: text('name').notNull(),
  teamId: text('team_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// ── Project members ──

export const projectMembers = pgTable(
  'project_members',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('viewer'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('project_members_project_user_idx').on(
      table.projectId,
      table.userId,
    ),
    index('project_members_user_idx').on(table.userId),
  ],
)

// ── Project invitations ──

export const projectInvitations = pgTable(
  'project_invitations',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text('email').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('viewer'),
    status: text('status').notNull().default('pending'),
  },
  (table) => [
    index('project_invitations_project_idx').on(table.projectId),
    index('project_invitations_email_idx').on(table.email),
  ],
)

// ── Services (the atomic unit: can have analytics, status, or both) ──

export const services = pgTable('services', {
  allowedOrigins: text('allowed_origins').array().notNull().default([]),
  analyticsEnabled: boolean('analytics_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  dataRetentionDays: integer('data_retention_days').notNull().default(365),
  domain: text('domain'),
  enabled: boolean('enabled').notNull().default(true),
  environments: text('environments').array().notNull().default(['production']),
  id: uuid('id').primaryKey().defaultRandom(),
  image: text('image'),
  name: text('name').notNull(),
  primaryDomain: text('primary_domain'),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  publicStatusHost: text('public_status_host'),
  salt: text('salt'),
  slug: text('slug').notNull(),
  statusEnabled: boolean('status_enabled').notNull().default(false),
  trackErrors: boolean('track_errors').notNull().default(true),
  trackEvents: boolean('track_events').notNull().default(true),
  trackFeatureFlags: boolean('track_feature_flags').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// ── Service members ──

export const serviceMembers = pgTable(
  'service_members',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    role: text('role').notNull().default('viewer'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('service_members_service_user_idx').on(
      table.serviceId,
      table.userId,
    ),
    index('service_members_user_idx').on(table.userId),
  ],
)

// ── Service invitations ──

export const serviceInvitations = pgTable(
  'service_invitations',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text('email').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('viewer'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
  },
  (table) => [
    index('service_invitations_service_idx').on(table.serviceId),
    index('service_invitations_email_idx').on(table.email),
  ],
)

// ── Analytics tables (linked to services) ──

export const visitorSessions = pgTable(
  'visitor_sessions',
  {
    browserName: text('browser_name').notNull(),
    browserVersion: text('browser_version').notNull(),
    city: text('city'),
    countryCode: text('country_code'),
    deviceType: text('device_type').notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    environment: text('environment').notNull().default('production'),
    id: uuid('id').primaryKey().defaultRandom(),
    isBot: boolean('is_bot').notNull().default(false),
    language: text('language'),
    osName: text('os_name').notNull(),
    osVersion: text('os_version').notNull(),
    referrer: text('referrer'),
    region: text('region'),
    screenHeight: integer('screen_height'),
    screenWidth: integer('screen_width'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    timezone: text('timezone'),
    utmCampaign: text('utm_campaign'),
    utmContent: text('utm_content'),
    utmMedium: text('utm_medium'),
    utmSource: text('utm_source'),
    utmTerm: text('utm_term'),
    visitorHash: text('visitor_hash').notNull(),
  },
  (table) => [
    index('visitor_sessions_service_id_idx').on(table.serviceId),
    index('visitor_sessions_started_at_idx').on(table.startedAt),
    index('visitor_sessions_visitor_hash_idx').on(table.visitorHash),
    index('visitor_sessions_service_started_idx').on(
      table.serviceId,
      table.startedAt,
    ),
  ],
)

export const pageViews = pgTable(
  'page_views',
  {
    durationMs: integer('duration_ms'),
    enteredAt: timestamp('entered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    path: text('path').notNull(),
    referrer: text('referrer'),
    scrollDepthPct: integer('scroll_depth_pct'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => visitorSessions.id, { onDelete: 'cascade' }),
    title: text('title'),
  },
  (table) => [
    index('page_views_service_id_idx').on(table.serviceId),
    index('page_views_session_id_idx').on(table.sessionId),
    index('page_views_entered_at_idx').on(table.enteredAt),
    index('page_views_service_path_idx').on(table.serviceId, table.path),
  ],
)

export const events = pgTable(
  'events',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    path: text('path'),
    properties:
      jsonb('properties').$type<
        Record<string, boolean | null | number | string>
      >(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => visitorSessions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('events_service_id_idx').on(table.serviceId),
    index('events_session_id_idx').on(table.sessionId),
    index('events_name_idx').on(table.name),
    index('events_service_name_idx').on(table.serviceId, table.name),
  ],
)

export const consoleErrors = pgTable(
  'console_errors',
  {
    columnNumber: integer('column_number'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    level: text('level').notNull(),
    lineNumber: integer('line_number'),
    message: text('message').notNull(),
    path: text('path'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => visitorSessions.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url'),
    stack: text('stack'),
  },
  (table) => [
    index('console_errors_service_id_idx').on(table.serviceId),
    index('console_errors_session_id_idx').on(table.sessionId),
    index('console_errors_level_idx').on(table.level),
  ],
)

export const excludedDevices = pgTable(
  'excluded_devices',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    reason: text('reason'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    visitorHash: text('visitor_hash').notNull(),
  },
  (table) => [
    index('excluded_devices_service_id_idx').on(table.serviceId),
    index('excluded_devices_visitor_hash_idx').on(table.visitorHash),
  ],
)

export const featureFlags = pgTable(
  'feature_flags',
  {
    conditions: jsonb('conditions').$type<FeatureFlagConditions>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text('description'),
    enabled: boolean('enabled').notNull().default(false),
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('feature_flags_service_id_idx').on(table.serviceId),
    index('feature_flags_service_key_idx').on(table.serviceId, table.key),
  ],
)

export type FeatureFlagConditions = {
  countries?: string[]
  deviceTypes?: string[]
  percentage?: number
}

// ── Status tables (linked to services via endpoints) ──

export const statusEndpoints = pgTable(
  'status_endpoints',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    degradedMs: integer('degraded_ms').notNull(),
    displayName: text('display_name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    expectedStatusMax: integer('expected_status_max').notNull(),
    expectedStatusMin: integer('expected_status_min').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    internalHost: text('internal_host'),
    internalMode: text('internal_mode').notNull(),
    internalPath: text('internal_path').notNull(),
    internalUrl: text('internal_url'),
    intervalSec: integer('interval_sec').notNull(),
    key: text('key').notNull(),
    method: text('method').notNull(),
    publicUrl: text('public_url'),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    timeoutMs: integer('timeout_ms').notNull(),
    warnMs: integer('warn_ms').notNull(),
  },
  (table) => [
    uniqueIndex('status_endpoints_service_key_idx').on(
      table.serviceId,
      table.key,
    ),
  ],
)

export const statusChecks = pgTable(
  'status_checks',
  {
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
    degraded: boolean('degraded').notNull(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => statusEndpoints.id, { onDelete: 'cascade' }),
    errorKind: text('error_kind'),
    errorMessage: text('error_message'),
    id: uuid('id').primaryKey().defaultRandom(),
    latencyMs: integer('latency_ms'),
    ok: boolean('ok').notNull(),
    probe: text('probe').notNull(),
    statusCode: integer('status_code'),
  },
  (table) => [
    index('status_checks_endpoint_probe_at_idx').on(
      table.endpointId,
      table.probe,
      table.checkedAt,
    ),
  ],
)

export const statusInternetChecks = pgTable(
  'status_internet_checks',
  {
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
    errorKind: text('error_kind'),
    errorMessage: text('error_message'),
    id: uuid('id').primaryKey().defaultRandom(),
    latencyMs: integer('latency_ms'),
    ok: boolean('ok').notNull(),
  },
  (table) => [index('status_internet_checks_at_idx').on(table.checkedAt)],
)

export const statusRollupsDaily = pgTable(
  'status_rollups_daily',
  {
    avgLatencyMs: doublePrecision('avg_latency_ms'),
    dayStart: timestamp('day_start', { withTimezone: true }).notNull(),
    degraded: integer('degraded').notNull(),
    down: integer('down').notNull(),
    endpointId: uuid('endpoint_id')
      .notNull()
      .references(() => statusEndpoints.id, { onDelete: 'cascade' }),
    p95LatencyMs: integer('p95_latency_ms'),
    probe: text('probe').notNull(),
    total: integer('total').notNull(),
    up: integer('up').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.endpointId, table.probe, table.dayStart],
    }),
  ],
)

export const statusServiceDokploy = pgTable('status_service_dokploy', {
  lastDeployedAt: timestamp('last_deployed_at', { withTimezone: true }),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }).notNull(),
  refId: text('ref_id').notNull(),
  serviceId: uuid('service_id')
    .primaryKey()
    .references(() => services.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
})

// ── Relations ──

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  members: many(members),
  passkeys: many(passkeys),
  projectMembers: many(projectMembers),
  serviceMembers: many(serviceMembers),
  sessions: many(sessions),
  twoFactors: many(twoFactors),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}))

export const twoFactorsRelations = relations(twoFactors, ({ one }) => ({
  user: one(users, {
    fields: [twoFactors.userId],
    references: [users.id],
  }),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  invitations: many(invitations),
  members: many(members),
  projects: many(projects),
}))

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
}))

export const projectsRelations = relations(projects, ({ many, one }) => ({
  invitations: many(projectInvitations),
  members: many(projectMembers),
  services: many(services),
  team: one(organizations, {
    fields: [projects.teamId],
    references: [organizations.id],
  }),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}))

export const projectInvitationsRelations = relations(
  projectInvitations,
  ({ one }) => ({
    inviter: one(users, {
      fields: [projectInvitations.inviterId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [projectInvitations.projectId],
      references: [projects.id],
    }),
  }),
)

export const serviceMembersRelations = relations(serviceMembers, ({ one }) => ({
  service: one(services, {
    fields: [serviceMembers.serviceId],
    references: [services.id],
  }),
  user: one(users, {
    fields: [serviceMembers.userId],
    references: [users.id],
  }),
}))

export const serviceInvitationsRelations = relations(
  serviceInvitations,
  ({ one }) => ({
    inviter: one(users, {
      fields: [serviceInvitations.inviterId],
      references: [users.id],
    }),
    service: one(services, {
      fields: [serviceInvitations.serviceId],
      references: [services.id],
    }),
  }),
)

export const servicesRelations = relations(services, ({ many, one }) => ({
  consoleErrors: many(consoleErrors),
  dokploy: one(statusServiceDokploy),
  endpoints: many(statusEndpoints),
  events: many(events),
  excludedDevices: many(excludedDevices),
  featureFlags: many(featureFlags),
  invitations: many(serviceInvitations),
  members: many(serviceMembers),
  pageViews: many(pageViews),
  project: one(projects, {
    fields: [services.projectId],
    references: [projects.id],
  }),
  visitorSessions: many(visitorSessions),
}))

export const visitorSessionsRelations = relations(
  visitorSessions,
  ({ many, one }) => ({
    consoleErrors: many(consoleErrors),
    events: many(events),
    pageViews: many(pageViews),
    service: one(services, {
      fields: [visitorSessions.serviceId],
      references: [services.id],
    }),
  }),
)

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  service: one(services, {
    fields: [pageViews.serviceId],
    references: [services.id],
  }),
  visitorSession: one(visitorSessions, {
    fields: [pageViews.sessionId],
    references: [visitorSessions.id],
  }),
}))

export const eventsRelations = relations(events, ({ one }) => ({
  service: one(services, {
    fields: [events.serviceId],
    references: [services.id],
  }),
  visitorSession: one(visitorSessions, {
    fields: [events.sessionId],
    references: [visitorSessions.id],
  }),
}))

export const consoleErrorsRelations = relations(consoleErrors, ({ one }) => ({
  service: one(services, {
    fields: [consoleErrors.serviceId],
    references: [services.id],
  }),
  visitorSession: one(visitorSessions, {
    fields: [consoleErrors.sessionId],
    references: [visitorSessions.id],
  }),
}))

export const excludedDevicesRelations = relations(
  excludedDevices,
  ({ one }) => ({
    service: one(services, {
      fields: [excludedDevices.serviceId],
      references: [services.id],
    }),
  }),
)

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  service: one(services, {
    fields: [featureFlags.serviceId],
    references: [services.id],
  }),
}))

export const statusEndpointsRelations = relations(
  statusEndpoints,
  ({ many, one }) => ({
    checks: many(statusChecks),
    rollups: many(statusRollupsDaily),
    service: one(services, {
      fields: [statusEndpoints.serviceId],
      references: [services.id],
    }),
  }),
)

export const statusChecksRelations = relations(statusChecks, ({ one }) => ({
  endpoint: one(statusEndpoints, {
    fields: [statusChecks.endpointId],
    references: [statusEndpoints.id],
  }),
}))

export const statusRollupsDailyRelations = relations(
  statusRollupsDaily,
  ({ one }) => ({
    endpoint: one(statusEndpoints, {
      fields: [statusRollupsDaily.endpointId],
      references: [statusEndpoints.id],
    }),
  }),
)

export const statusServiceDokployRelations = relations(
  statusServiceDokploy,
  ({ one }) => ({
    service: one(services, {
      fields: [statusServiceDokploy.serviceId],
      references: [services.id],
    }),
  }),
)
