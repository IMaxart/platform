import { z } from 'zod/v4'

const sessionPayloadSchema = z.object({
  device: z.object({
    browserName: z.string(),
    browserVersion: z.string(),
    deviceType: z.enum(['desktop', 'mobile', 'tablet']),
    language: z.string(),
    osName: z.string(),
    osVersion: z.string(),
    screenHeight: z.number().int().nonnegative(),
    screenWidth: z.number().int().nonnegative(),
    timezone: z.string(),
  }),
  environment: z.string().min(1).max(50).default('production'),
  referrer: z.string().nullable(),
  sessionId: z.string().min(1),
  type: z.literal('session'),
  utmCampaign: z.string().nullable(),
  utmContent: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmSource: z.string().nullable(),
  utmTerm: z.string().nullable(),
})

const pageViewPayloadSchema = z.object({
  durationMs: z.number().int().nonnegative().nullable(),
  enteredAt: z.number(),
  path: z.string().min(1),
  referrer: z.string().nullable(),
  scrollDepthPct: z.number().int().min(0).max(100).nullable(),
  sessionId: z.string().min(1),
  title: z.string(),
  type: z.literal('pageview'),
})

const eventPayloadSchema = z.object({
  name: z.string().min(1).max(200),
  path: z.string().nullable(),
  properties: z.record(z.string(), z.unknown()).nullable(),
  sessionId: z.string().min(1),
  type: z.literal('event'),
})

const errorPayloadSchema = z.object({
  columnNumber: z.number().int().nullable(),
  level: z.enum(['error', 'warning']),
  lineNumber: z.number().int().nullable(),
  message: z.string().max(2000),
  path: z.string().nullable(),
  sessionId: z.string().min(1),
  sourceUrl: z.string().nullable(),
  stack: z.string().max(5000).nullable(),
  type: z.literal('error'),
})

export const collectPayloadSchema = z.discriminatedUnion('type', [
  sessionPayloadSchema,
  pageViewPayloadSchema,
  eventPayloadSchema,
  errorPayloadSchema,
])

export const collectBatchSchema = z.array(collectPayloadSchema).min(1).max(50)

export type CollectBatch = z.infer<typeof collectBatchSchema>
export type CollectPayload = z.infer<typeof collectPayloadSchema>
