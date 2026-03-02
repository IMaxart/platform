import { db } from '@platform/db'
import {
  projectInvitations,
  projectMembers,
  projects,
  users,
} from '@platform/db/schema'
import { sendMail } from '@platform/email'
import { ProjectInvite } from '@platform/email/templates'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'

import { INVITATION_EXPIRY_DAYS } from './constants'

export const getProjects = createServerFn({ method: 'GET' })
  .inputValidator((d: undefined | { teamId?: string }) => d)
  .handler(async ({ data }) => {
    const teamId = data?.teamId
    const conditions = teamId !== undefined ? [eq(projects.teamId, teamId)] : []

    return db.query.projects.findMany({
      orderBy: [desc(projects.createdAt)],
      where: conditions.length > 0 ? and(...conditions) : undefined,
    })
  })

export const getProject = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
    })
  })

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; teamId?: string }) => d)
  .handler(async ({ data }) => {
    const [project] = await db
      .insert(projects)
      .values({
        name: data.name,
        teamId: data.teamId ?? null,
      })
      .returning()

    return project
  })

export const getProjectDeletionInfo = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        members: {
          columns: { id: true, userId: true },
          with: { user: { columns: { name: true } } },
        },
        services: { columns: { id: true, name: true } },
      },
    })

    return project ?? null
  })

export const deleteProject = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(projects).where(eq(projects.id, data.projectId))

    return { ok: true }
  })

// ── Project Members ──

export const getProjectMembers = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db
      .select({
        createdAt: projectMembers.createdAt,
        email: users.email,
        id: projectMembers.id,
        name: users.name,
        role: projectMembers.role,
        userId: projectMembers.userId,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(desc(projectMembers.createdAt))
  })

export const addProjectMember = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { projectId: string; role?: string; userId: string }) => d,
  )
  .handler(async ({ data }) => {
    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId: data.projectId,
        role: data.role ?? 'viewer',
        userId: data.userId,
      })
      .onConflictDoNothing()
      .returning()

    return member ?? null
  })

export const removeProjectMember = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(projectMembers).where(eq(projectMembers.id, data.memberId))

    return { ok: true }
  })

export const updateProjectMemberRole = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string; role: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(projectMembers)
      .set({ role: data.role })
      .where(eq(projectMembers.id, data.memberId))

    return { ok: true }
  })

// ── Project Invitations ──

export const createProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      email: string
      inviterId: string
      projectId: string
      role?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const [invitation] = await db
      .insert(projectInvitations)
      .values({
        email: data.email,
        expiresAt,
        inviterId: data.inviterId,
        projectId: data.projectId,
        role: data.role ?? 'viewer',
      })
      .returning()

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, data.projectId),
    })

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, data.inviterId),
    })

    if (invitation) {
      const baseUrl = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'

      await sendMail({
        subject: `You've been invited to project ${project?.name ?? data.projectId}`,
        template: ProjectInvite({
          inviterName: inviter?.name,
          projectName: project?.name ?? data.projectId,
          role: invitation.role,
          url: `${baseUrl}/invite/project/${invitation.id}`,
        }),
        to: data.email,
      })
    }

    return invitation
  })

export const getProjectInvitations = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db
      .select({
        createdAt: projectInvitations.createdAt,
        email: projectInvitations.email,
        expiresAt: projectInvitations.expiresAt,
        id: projectInvitations.id,
        role: projectInvitations.role,
        status: projectInvitations.status,
      })
      .from(projectInvitations)
      .where(
        and(
          eq(projectInvitations.projectId, projectId),
          eq(projectInvitations.status, 'pending'),
        ),
      )
      .orderBy(desc(projectInvitations.createdAt))
  })

export const cancelProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(projectInvitations)
      .set({ status: 'cancelled' })
      .where(eq(projectInvitations.id, data.invitationId))

    return { ok: true }
  })

export const acceptProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const invitation = await db.query.projectInvitations.findFirst({
      where: eq(projectInvitations.id, data.invitationId),
    })

    if (!invitation) return { error: 'Invitation not found' }
    if (invitation.status !== 'pending') return { error: 'Invitation expired' }
    if (new Date() > invitation.expiresAt)
      return { error: 'Invitation expired' }

    await db
      .insert(projectMembers)
      .values({
        projectId: invitation.projectId,
        role: invitation.role,
        userId: data.userId,
      })
      .onConflictDoNothing()

    await db
      .update(projectInvitations)
      .set({ status: 'accepted' })
      .where(eq(projectInvitations.id, data.invitationId))

    return { ok: true, projectId: invitation.projectId }
  })

export const getProjectInvitationById = createServerFn({ method: 'GET' })
  .inputValidator((invitationId: string) => invitationId)
  .handler(async ({ data: invitationId }) => {
    const invitation = await db.query.projectInvitations.findFirst({
      where: eq(projectInvitations.id, invitationId),
      with: { project: true },
    })

    return invitation ?? null
  })
