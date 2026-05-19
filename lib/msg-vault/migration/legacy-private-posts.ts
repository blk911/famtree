/**
 * Legacy PRIVATE / FAMILY+visibility Post → Msg Vault migration planner & applier.
 * @see docs/msg-vault/legacy-private-post-migration-map.md
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { makeDirectConversationKey } from "@/lib/msg-vault/directKey";

const MIGRATION_VERSION = 1;
export const LEGACY_POST_IMPORTED_EVENT = "LEGACY_POST_IMPORTED";

export type LegacyPostRow = {
  id: string;
  body: string;
  imageUrl: string | null;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  authorUserId: string;
  visibilityUserIds: string[];
};

export type SkipReason =
  | "no_visibility"
  | "empty_content"
  | "missing_author"
  | "inactive_author"
  | "inactive_participant"
  | "missing_user"
  | "already_migrated"
  | "self_only_thread";

export type SkippedRecord = {
  postId: string;
  reason: SkipReason;
  detail?: string;
};

export type DuplicateRisk = {
  kind: "existing_direct_conversation" | "existing_tu_thread" | "existing_group_migration" | "duplicate_post_in_plan";
  legacyThreadKey: string;
  detail: string;
};

export type ThreadPlan = {
  legacyThreadKey: string;
  kind: "DIRECT" | "THREAD";
  directKey: string | null;
  trustUnitId: string | null;
  title: string;
  participantIds: string[];
  posts: LegacyPostRow[];
  existingConversationId: string | null;
  messagesToCreate: number;
  messagesAlreadyMigrated: number;
};

export type MigrationPlan = {
  eligiblePostCount: number;
  skipped: SkippedRecord[];
  threads: ThreadPlan[];
  inferredConversationCount: number;
  inferredParticipantCount: number;
  messagesToCreate: number;
  messagesAlreadyMigrated: number;
  duplicateRisks: DuplicateRisk[];
  missingUserIds: string[];
  missingTrustUnitIds: string[];
};

export function participantKey(visibilityIds: string[], authorId: string): string {
  const ids = new Set([...visibilityIds, authorId]);
  return Array.from(ids).sort().join(",");
}

export function tuThreadKey(memberUserIds: string[]): string {
  return [...memberUserIds].sort().join(",");
}

function messageBodyFromPost(post: LegacyPostRow): string {
  const text = post.body.trim();
  if (post.imageUrl?.trim()) {
    const url = post.imageUrl.trim();
    return text ? `${text}\n\n[attachment: ${url}]` : `[attachment: ${url}]`;
  }
  return text;
}

export async function loadMigratedPostIds(): Promise<Set<string>> {
  const events = await prisma.aihMsgGovernanceEvent.findMany({
    where: { eventType: LEGACY_POST_IMPORTED_EVENT },
    select: { contextJson: true },
  });
  const ids = new Set<string>();
  for (const e of events) {
    const json = e.contextJson as { legacyPostId?: string } | null;
    if (json?.legacyPostId) ids.add(json.legacyPostId);
  }
  return ids;
}

export async function loadEligibleLegacyPosts(): Promise<
  Array<{
    id: string;
    body: string;
    imageUrl: string | null;
    scope: string;
    createdAt: Date;
    updatedAt: Date;
    visibility: { userId: string }[];
    profile: { userId: string; user: { id: string; status: string } | null };
  }>
> {
  return prisma.post.findMany({
    where: {
      OR: [
        { scope: "PRIVATE", visibility: { some: {} } },
        { scope: "FAMILY", visibility: { some: {} } },
      ],
    },
    include: {
      visibility: { select: { userId: true } },
      profile: {
        select: {
          userId: true,
          user: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function loadActiveTrustUnits(): Promise<
  Array<{ id: string; memberUserIds: string[]; title: string }>
> {
  const rows = await prisma.trustUnit.findMany({
    where: { status: "ACTIVE" },
    include: {
      members: { select: { userId: true } },
      aihMeta: { select: { name: true } },
    },
  });
  return rows.map((tu) => ({
    id: tu.id,
    memberUserIds: tu.members.map((m) => m.userId),
    title:
      tu.aihMeta?.name?.trim() ||
      tu.members.length > 0
        ? `Trust unit (${tu.members.length} members)`
        : "Trust unit thread",
  }));
}

type BuildPlanOptions = {
  migratedPostIds: Set<string>;
  activeUserIds: Set<string>;
  trustUnits: Array<{ id: string; memberUserIds: string[]; title: string }>;
  existingDirectKeys: Map<string, string>;
  existingTuThreads: Map<string, string>;
  existingGroupByLegacyKey: Map<string, string>;
};

export async function buildMigrationPlan(): Promise<MigrationPlan> {
  const [rawPosts, migratedPostIds, trustUnits, users, directConvs, tuConvs, migratedConvs] =
    await Promise.all([
      loadEligibleLegacyPosts(),
      loadMigratedPostIds(),
      loadActiveTrustUnits(),
      prisma.user.findMany({ select: { id: true, status: true } }),
      prisma.aihMsgConversation.findMany({
        where: { directKey: { not: null } },
        select: { id: true, directKey: true },
      }),
      prisma.aihMsgConversation.findMany({
        where: { kind: "THREAD", trustUnitId: { not: null } },
        select: { id: true, trustUnitId: true },
      }),
      prisma.aihMsgConversation.findMany({
        where: { kind: "THREAD", trustUnitId: null },
        select: { id: true, policySnapshot: true },
      }),
    ]);

  const activeUserIds = new Set(
    users.filter((u) => u.status === "active").map((u) => u.id),
  );
  const allUserIds = new Set(users.map((u) => u.id));

  const existingDirectKeys = new Map(
    directConvs.map((c) => [c.directKey!, c.id] as const),
  );
  const existingTuThreads = new Map(
    tuConvs.map((c) => [c.trustUnitId!, c.id] as const),
  );
  const existingGroupByLegacyKey = new Map<string, string>();
  for (const c of migratedConvs) {
    const snap = c.policySnapshot as { migration?: { legacyThreadKey?: string } } | null;
    const key = snap?.migration?.legacyThreadKey;
    if (key) existingGroupByLegacyKey.set(key, c.id);
  }

  const tuKeyToUnit = new Map(
    trustUnits.map((tu) => [tuThreadKey(tu.memberUserIds), tu] as const),
  );

  const skipped: SkippedRecord[] = [];
  const postsByThreadKey = new Map<string, LegacyPostRow[]>();
  const missingUserIds = new Set<string>();
  let messagesAlreadyMigrated = 0;

  for (const row of rawPosts) {
    const visIds = row.visibility.map((v) => v.userId);
    if (visIds.length === 0) {
      skipped.push({ postId: row.id, reason: "no_visibility" });
      continue;
    }

    const authorId = row.profile.user?.id ?? row.profile.userId;
    if (!row.profile.user) {
      skipped.push({ postId: row.id, reason: "missing_author" });
      continue;
    }
    if (!activeUserIds.has(authorId)) {
      skipped.push({
        postId: row.id,
        reason: "inactive_author",
        detail: authorId,
      });
      continue;
    }

    const bodyOk = row.body.trim().length > 0 || Boolean(row.imageUrl?.trim());
    if (!bodyOk) {
      skipped.push({ postId: row.id, reason: "empty_content" });
      continue;
    }

    if (migratedPostIds.has(row.id)) {
      skipped.push({ postId: row.id, reason: "already_migrated" });
      messagesAlreadyMigrated++;
      continue;
    }

    const memberIds = participantKey(visIds, authorId).split(",");
    if (memberIds.length < 2) {
      skipped.push({ postId: row.id, reason: "self_only_thread" });
      continue;
    }

    let participantsOk = true;
    for (const uid of memberIds) {
      if (!allUserIds.has(uid)) {
        missingUserIds.add(uid);
        skipped.push({ postId: row.id, reason: "missing_user", detail: uid });
        participantsOk = false;
        break;
      }
      if (!activeUserIds.has(uid)) {
        skipped.push({ postId: row.id, reason: "inactive_participant", detail: uid });
        participantsOk = false;
        break;
      }
    }
    if (!participantsOk) continue;

    const key = participantKey(visIds, authorId);
    const legacy: LegacyPostRow = {
      id: row.id,
      body: row.body,
      imageUrl: row.imageUrl,
      scope: row.scope,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorUserId: authorId,
      visibilityUserIds: visIds,
    };
    if (!postsByThreadKey.has(key)) postsByThreadKey.set(key, []);
    postsByThreadKey.get(key)!.push(legacy);
  }

  const duplicateRisks: DuplicateRisk[] = [];
  const threads: ThreadPlan[] = [];
  const seenPostIds = new Set<string>();

  for (const [legacyThreadKey, posts] of Array.from(postsByThreadKey.entries())) {
    posts.sort((a: LegacyPostRow, b: LegacyPostRow) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const p of posts) {
      if (seenPostIds.has(p.id)) {
        duplicateRisks.push({
          kind: "duplicate_post_in_plan",
          legacyThreadKey,
          detail: `Post ${p.id} appears more than once in plan`,
        });
      }
      seenPostIds.add(p.id);
    }

    const participantIds = legacyThreadKey.split(",");
    const tu = tuKeyToUnit.get(legacyThreadKey);
    let kind: "DIRECT" | "THREAD";
    let directKey: string | null = null;
    let trustUnitId: string | null = null;
    let title: string;
    let existingConversationId: string | null = null;

    if (tu) {
      kind = "THREAD";
      trustUnitId = tu.id;
      title = tu.title;
      existingConversationId = existingTuThreads.get(tu.id) ?? null;
      if (existingConversationId) {
        duplicateRisks.push({
          kind: "existing_tu_thread",
          legacyThreadKey,
          detail: `Vault thread already exists for trust unit ${tu.id}`,
        });
      }
    } else if (participantIds.length === 2) {
      kind = "DIRECT";
      directKey = makeDirectConversationKey(participantIds[0]!, participantIds[1]!);
      title = "Direct";
      existingConversationId = existingDirectKeys.get(directKey) ?? null;
      if (existingConversationId) {
        duplicateRisks.push({
          kind: "existing_direct_conversation",
          legacyThreadKey,
          detail: `Vault direct conversation exists for directKey ${directKey}`,
        });
      }
    } else {
      kind = "THREAD";
      title = `Group (${participantIds.length})`;
      existingConversationId = existingGroupByLegacyKey.get(legacyThreadKey) ?? null;
      if (existingConversationId) {
        duplicateRisks.push({
          kind: "existing_group_migration",
          legacyThreadKey,
          detail: `Vault group migration conversation exists`,
        });
      }
    }

    const messagesToCreate = posts.filter((p: LegacyPostRow) => !migratedPostIds.has(p.id)).length;

    threads.push({
      legacyThreadKey,
      kind,
      directKey,
      trustUnitId,
      title,
      participantIds,
      posts,
      existingConversationId,
      messagesToCreate,
      messagesAlreadyMigrated: posts.length - messagesToCreate,
    });
  }

  const participantUnion = new Set<string>();
  for (const t of threads) {
    for (const id of t.participantIds) participantUnion.add(id);
  }

  const messagesToCreate = threads.reduce((n, t) => n + t.messagesToCreate, 0);

  return {
    eligiblePostCount: rawPosts.length,
    skipped,
    threads,
    inferredConversationCount: threads.length,
    inferredParticipantCount: participantUnion.size,
    messagesToCreate,
    messagesAlreadyMigrated,
    duplicateRisks,
    missingUserIds: Array.from(missingUserIds),
    missingTrustUnitIds: [],
  };
}

export type ApplyResult = {
  conversationsCreated: number;
  conversationsReused: number;
  participantsCreated: number;
  messagesCreated: number;
  governanceEventsCreated: number;
  errors: Array<{ legacyThreadKey: string; message: string }>;
};

export async function applyMigrationPlan(plan: MigrationPlan): Promise<ApplyResult> {
  const migratedPostIds = await loadMigratedPostIds();
  const result: ApplyResult = {
    conversationsCreated: 0,
    conversationsReused: 0,
    participantsCreated: 0,
    messagesCreated: 0,
    governanceEventsCreated: 0,
    errors: [],
  };

  for (const thread of plan.threads) {
    if (thread.messagesToCreate === 0) continue;

    try {
      await prisma.$transaction(async (tx) => {
        let conversationId = thread.existingConversationId;

        if (!conversationId) {
          if (thread.kind === "DIRECT" && thread.directKey) {
            const existing = await tx.aihMsgConversation.findUnique({
              where: { directKey: thread.directKey },
            });
            if (existing) conversationId = existing.id;
          } else if (thread.trustUnitId) {
            const existing = await tx.aihMsgConversation.findFirst({
              where: { kind: "THREAD", trustUnitId: thread.trustUnitId },
            });
            if (existing) conversationId = existing.id;
          } else {
            const candidates = await tx.aihMsgConversation.findMany({
              where: { kind: "THREAD", trustUnitId: null },
              select: { id: true, policySnapshot: true },
            });
            const existing = candidates.find((c) => {
              const snap = c.policySnapshot as { migration?: { legacyThreadKey?: string } } | null;
              return snap?.migration?.legacyThreadKey === thread.legacyThreadKey;
            });
            if (existing) conversationId = existing.id;
          }
        }

        if (!conversationId) {
          const earliest = thread.posts[0]!;
          const createdById = earliest.authorUserId;
          const policySnapshot = {
            sourceType: "migrated",
            preGovernanceLegacy: true,
            migration: {
              version: MIGRATION_VERSION,
              legacyThreadKey: thread.legacyThreadKey,
              legacyScopes: Array.from(new Set(thread.posts.map((p) => p.scope))),
              migratedAt: new Date().toISOString(),
            },
          } satisfies Prisma.InputJsonValue;

          const conv = await tx.aihMsgConversation.create({
            data: {
              kind: thread.kind,
              title: thread.kind === "DIRECT" ? null : thread.title,
              createdById,
              directKey: thread.directKey,
              trustUnitId: thread.trustUnitId,
              visibilityScope: thread.trustUnitId ? "trust_unit" : "guardian_only",
              status: "ACTIVE",
              policySnapshot,
              lastMessageAt: thread.posts[thread.posts.length - 1]!.createdAt,
              createdAt: earliest.createdAt,
              updatedAt: thread.posts[thread.posts.length - 1]!.createdAt,
            },
          });
          conversationId = conv.id;
          result.conversationsCreated++;
        } else {
          result.conversationsReused++;
        }

        const existingParticipants = await tx.aihMsgParticipant.findMany({
          where: { conversationId },
          select: { userId: true },
        });
        const haveParticipant = new Set(existingParticipants.map((p) => p.userId));

        const ownerId = thread.posts[0]!.authorUserId;
        for (const userId of thread.participantIds) {
          if (haveParticipant.has(userId)) continue;
          const earliestForUser = thread.posts.find(
            (p) =>
              p.authorUserId === userId ||
              p.visibilityUserIds.includes(userId),
          );
          await tx.aihMsgParticipant.create({
            data: {
              conversationId,
              userId,
              role: userId === ownerId ? "OWNER" : "PARTICIPANT",
              status: "ACTIVE",
              joinedAt: earliestForUser?.createdAt ?? thread.posts[0]!.createdAt,
            },
          });
          result.participantsCreated++;
          haveParticipant.add(userId);
        }

        for (const post of thread.posts) {
          if (migratedPostIds.has(post.id)) continue;

          const dupEvent = await tx.aihMsgGovernanceEvent.findFirst({
            where: {
              eventType: LEGACY_POST_IMPORTED_EVENT,
              contextJson: { path: ["legacyPostId"], equals: post.id },
            },
          });
          if (dupEvent) {
            migratedPostIds.add(post.id);
            continue;
          }

          const bodyText = messageBodyFromPost(post);
          const msg = await tx.aihMsgMessage.create({
            data: {
              conversationId,
              authorId: post.authorUserId,
              bodyText,
              status: "SENT",
              governanceState: "allowed",
              escalationState: "none",
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
            },
          });

          await tx.aihMsgGovernanceEvent.create({
            data: {
              conversationId,
              messageId: msg.id,
              actorUserId: post.authorUserId,
              eventType: LEGACY_POST_IMPORTED_EVENT,
              contextJson: {
                legacyPostId: post.id,
                legacyScope: post.scope,
                legacyThreadKey: thread.legacyThreadKey,
                version: MIGRATION_VERSION,
              },
            },
          });

          migratedPostIds.add(post.id);
          result.messagesCreated++;
          result.governanceEventsCreated++;
        }

        const lastAt = thread.posts[thread.posts.length - 1]!.createdAt;
        await tx.aihMsgConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: lastAt, updatedAt: lastAt },
        });
      });
    } catch (err) {
      result.errors.push({
        legacyThreadKey: thread.legacyThreadKey,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
