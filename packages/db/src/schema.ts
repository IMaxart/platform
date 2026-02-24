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

export const projects = pgTable('projects', {
  allowedOrigins: text('allowed_origins').array().notNull().default([]),
  analyticsSubdomain: text('analytics_subdomain').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  dataRetentionDays: integer('data_retention_days').notNull().default(365),
  domain: text('domain').notNull().unique(),
  environments: text('environments').array().notNull().default(['production']),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  salt: text('salt').notNull(),
  trackErrors: boolean('track_errors').notNull().default(true),
  trackEvents: boolean('track_events').notNull().default(true),
  trackFeatureFlags: boolean('track_feature_flags').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const sessions = pgTable(
  'sessions',
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    referrer: text('referrer'),
    region: text('region'),
    screenHeight: integer('screen_height'),
    screenWidth: integer('screen_width'),
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
    index('sessions_project_id_idx').on(table.projectId),
    index('sessions_started_at_idx').on(table.startedAt),
    index('sessions_visitor_hash_idx').on(table.visitorHash),
    index('sessions_project_started_idx').on(table.projectId, table.startedAt),
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    referrer: text('referrer'),
    scrollDepthPct: integer('scroll_depth_pct'),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    title: text('title'),
  },
  (table) => [
    index('page_views_project_id_idx').on(table.projectId),
    index('page_views_session_id_idx').on(table.sessionId),
    index('page_views_entered_at_idx').on(table.enteredAt),
    index('page_views_project_path_idx').on(table.projectId, table.path),
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    properties:
      jsonb('properties').$type<
        Record<string, boolean | null | number | string>
      >(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('events_project_id_idx').on(table.projectId),
    index('events_session_id_idx').on(table.sessionId),
    index('events_name_idx').on(table.name),
    index('events_project_name_idx').on(table.projectId, table.name),
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url'),
    stack: text('stack'),
  },
  (table) => [
    index('console_errors_project_id_idx').on(table.projectId),
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    visitorHash: text('visitor_hash').notNull(),
  },
  (table) => [
    index('excluded_devices_project_id_idx').on(table.projectId),
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
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('feature_flags_project_id_idx').on(table.projectId),
    index('feature_flags_project_key_idx').on(table.projectId, table.key),
  ],
)

export type FeatureFlagConditions = {
  countries?: string[]
  deviceTypes?: string[]
  percentage?: number
}

// Relations

export const projectsRelations = relations(projects, ({ many }) => ({
  consoleErrors: many(consoleErrors),
  events: many(events),
  excludedDevices: many(excludedDevices),
  featureFlags: many(featureFlags),
  pageViews: many(pageViews),
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ many, one }) => ({
  consoleErrors: many(consoleErrors),
  events: many(events),
  pageViews: many(pageViews),
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id],
  }),
}))

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  project: one(projects, {
    fields: [pageViews.projectId],
    references: [projects.id],
  }),
  session: one(sessions, {
    fields: [pageViews.sessionId],
    references: [sessions.id],
  }),
}))

export const eventsRelations = relations(events, ({ one }) => ({
  project: one(projects, {
    fields: [events.projectId],
    references: [projects.id],
  }),
  session: one(sessions, {
    fields: [events.sessionId],
    references: [sessions.id],
  }),
}))

export const consoleErrorsRelations = relations(consoleErrors, ({ one }) => ({
  project: one(projects, {
    fields: [consoleErrors.projectId],
    references: [projects.id],
  }),
  session: one(sessions, {
    fields: [consoleErrors.sessionId],
    references: [sessions.id],
  }),
}))

export const excludedDevicesRelations = relations(
  excludedDevices,
  ({ one }) => ({
    project: one(projects, {
      fields: [excludedDevices.projectId],
      references: [projects.id],
    }),
  }),
)

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  project: one(projects, {
    fields: [featureFlags.projectId],
    references: [projects.id],
  }),
}))

// ── Status tables ──

export const statusServices = pgTable('status_services', {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  enabled: boolean('enabled').notNull().default(true),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  primaryDomain: text('primary_domain'),
  publicStatusHost: text('public_status_host').notNull().unique(),
  slug: text('slug').notNull().unique(),
})

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
      .references(() => statusServices.id, { onDelete: 'cascade' }),
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
    .references(() => statusServices.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
})

// ── Status relations ──

export const statusServicesRelations = relations(
  statusServices,
  ({ many, one }) => ({
    dokploy: one(statusServiceDokploy),
    endpoints: many(statusEndpoints),
  }),
)

export const statusEndpointsRelations = relations(
  statusEndpoints,
  ({ many, one }) => ({
    checks: many(statusChecks),
    rollups: many(statusRollupsDaily),
    service: one(statusServices, {
      fields: [statusEndpoints.serviceId],
      references: [statusServices.id],
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
    service: one(statusServices, {
      fields: [statusServiceDokploy.serviceId],
      references: [statusServices.id],
    }),
  }),
)
