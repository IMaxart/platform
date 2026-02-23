import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
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
