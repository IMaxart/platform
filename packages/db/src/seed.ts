import crypto from 'node:crypto'

import { db } from './index'
import {
  consoleErrors,
  events,
  featureFlags,
  pageViews,
  projects,
  visitorSessions,
} from './schema'

const DEMO_PROJECT = {
  allowedOrigins: ['http://localhost:3000'],
  analyticsSubdomain: 'localhost:3000',
  domain: 'localhost:3000',
  name: 'Demo Project',
  salt: crypto.randomBytes(32).toString('hex'),
}

const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'] as const
const OS_NAMES = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'] as const
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Arc', 'Zen'] as const
const COUNTRIES = ['PL', 'DE', 'US', 'GB', 'FR', 'CZ', 'NL'] as const
const PAGES = ['/', '/about', '/contact', '/blog', '/pricing', '/docs']
const EVENT_NAMES = [
  'button_click',
  'form_submit',
  'scroll_to_bottom',
  'cta_click',
  'newsletter_signup',
]

const randomItem = <T>(arr: readonly T[]): T => {
  const index = Math.floor(Math.random() * arr.length)
  const item = arr[index]
  if (item === undefined) throw new Error('Empty array')
  return item
}

const randomInt = ({ max, min }: { max: number; min: number }) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(randomInt({ max: 23, min: 0 }))
  date.setMinutes(randomInt({ max: 59, min: 0 }))
  return date
}

async function seed() {
  // eslint-disable-next-line no-console
  console.log('Seeding database...')

  const [project] = await db.insert(projects).values(DEMO_PROJECT).returning()

  if (!project) {
    throw new Error('Failed to create demo project')
  }

  // eslint-disable-next-line no-console
  console.log(`Created project: ${project.name} (${project.id})`)

  const sessionRecords = []

  for (let day = 0; day < 90; day++) {
    const sessionsPerDay = randomInt({ max: 40, min: 5 })

    for (let s = 0; s < sessionsPerDay; s++) {
      const startedAt = daysAgo(day)
      const durationMinutes = randomInt({ max: 30, min: 1 })
      const endedAt = new Date(
        startedAt.getTime() + durationMinutes * 60 * 1000,
      )
      const isBot = Math.random() < 0.08

      sessionRecords.push({
        browserName: randomItem(BROWSERS),
        browserVersion: `${randomInt({ max: 130, min: 90 })}.0`,
        city: null,
        countryCode: randomItem(COUNTRIES),
        deviceType: randomItem(DEVICE_TYPES),
        endedAt,
        isBot,
        language: randomItem(['pl', 'en', 'de']),
        osName: randomItem(OS_NAMES),
        osVersion: `${randomInt({ max: 17, min: 10 })}.${randomInt({ max: 9, min: 0 })}`,
        projectId: project.id,
        referrer: randomItem([
          null,
          'https://google.com',
          'https://facebook.com',
          'https://twitter.com',
          null,
        ]),
        region: null,
        screenHeight: randomItem([667, 1024, 720, 900, 1080]),
        screenWidth: randomItem([375, 768, 1280, 1440, 1920]),
        startedAt,
        timezone: 'Europe/Warsaw',
        utmCampaign: null,
        utmContent: null,
        utmMedium:
          Math.random() > 0.7 ? randomItem(['cpc', 'social', 'email']) : null,
        utmSource:
          Math.random() > 0.7
            ? randomItem(['google', 'facebook', 'newsletter'])
            : null,
        utmTerm: null,
        visitorHash: crypto.randomBytes(16).toString('hex'),
      })
    }
  }

  const BATCH_SIZE = 100
  const insertedSessions = []

  for (let i = 0; i < sessionRecords.length; i += BATCH_SIZE) {
    const batch = sessionRecords.slice(i, i + BATCH_SIZE)
    const result = await db.insert(visitorSessions).values(batch).returning()
    insertedSessions.push(...result)
  }

  // eslint-disable-next-line no-console
  console.log(`Created ${insertedSessions.length} sessions`)

  const pageViewRecords = []
  const eventRecords = []
  const errorRecords = []

  for (const session of insertedSessions) {
    const pagesCount = randomInt({ max: 6, min: 1 })

    for (let p = 0; p < pagesCount; p++) {
      const enteredAt = new Date(
        session.startedAt.getTime() +
          p * randomInt({ max: 120000, min: 10000 }),
      )

      pageViewRecords.push({
        durationMs: randomInt({ max: 300000, min: 5000 }),
        enteredAt,
        path: randomItem(PAGES),
        projectId: project.id,
        referrer: p === 0 ? session.referrer : null,
        scrollDepthPct: randomInt({ max: 100, min: 10 }),
        sessionId: session.id,
        title: `Page Title ${p + 1}`,
      })
    }

    if (Math.random() < 0.4) {
      eventRecords.push({
        createdAt: session.startedAt,
        name: randomItem(EVENT_NAMES),
        path: randomItem(PAGES),
        projectId: project.id,
        properties: { value: randomInt({ max: 100, min: 1 }) },
        sessionId: session.id,
      })
    }

    if (Math.random() < 0.1) {
      errorRecords.push({
        columnNumber: randomInt({ max: 80, min: 1 }),
        createdAt: session.startedAt,
        level: randomItem(['error', 'warning'] as const),
        lineNumber: randomInt({ max: 500, min: 1 }),
        message: randomItem([
          'TypeError: Cannot read properties of undefined',
          'ReferenceError: x is not defined',
          'NetworkError: Failed to fetch',
          'SyntaxError: Unexpected token',
        ]),
        path: randomItem(PAGES),
        projectId: project.id,
        sessionId: session.id,
        sourceUrl: 'https://example.com/app.js',
        stack: 'at Object.<anonymous> (app.js:1:1)',
      })
    }
  }

  for (let i = 0; i < pageViewRecords.length; i += BATCH_SIZE) {
    const batch = pageViewRecords.slice(i, i + BATCH_SIZE)
    await db.insert(pageViews).values(batch)
  }

  // eslint-disable-next-line no-console
  console.log(`Created ${pageViewRecords.length} page views`)

  for (let i = 0; i < eventRecords.length; i += BATCH_SIZE) {
    const batch = eventRecords.slice(i, i + BATCH_SIZE)
    await db.insert(events).values(batch)
  }

  // eslint-disable-next-line no-console
  console.log(`Created ${eventRecords.length} events`)

  if (errorRecords.length > 0) {
    for (let i = 0; i < errorRecords.length; i += BATCH_SIZE) {
      const batch = errorRecords.slice(i, i + BATCH_SIZE)
      await db.insert(consoleErrors).values(batch)
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Created ${errorRecords.length} console errors`)

  await db.insert(featureFlags).values([
    {
      conditions: { percentage: 50 },
      description: 'Enable the redesigned checkout experience',
      enabled: true,
      key: 'new_checkout_flow',
      projectId: project.id,
    },
    {
      conditions: null,
      description: 'Enable dark mode for all users',
      enabled: true,
      key: 'dark_mode',
      projectId: project.id,
    },
    {
      conditions: { countries: ['PL', 'DE'], deviceTypes: ['desktop'] },
      description: 'Show beta features to selected countries',
      enabled: false,
      key: 'beta_features',
      projectId: project.id,
    },
  ])

  // eslint-disable-next-line no-console
  console.log('Created 3 feature flags')

  // eslint-disable-next-line no-console
  console.log('Seeding complete!')
  process.exit(0)
}

void seed()
