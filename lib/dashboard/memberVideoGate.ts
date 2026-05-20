import { prisma } from "@/lib/db/prisma";
import { DEFAULT_MEMBER_VIDEO_SLUG, isMemberVideoGateEnvEnabled } from "@/lib/admin/memberVideoMessages";

export type ActiveMemberVideo = {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
};

export async function getActiveMemberVideoForUser(
  userId: string,
  slug: string = DEFAULT_MEMBER_VIDEO_SLUG,
): Promise<ActiveMemberVideo | null> {
  if (!isMemberVideoGateEnvEnabled()) return null;

  const message = await prisma.memberVideoMessage.findFirst({
    where: { slug, isEnabled: true, videoUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      caption: true,
      videoUrl: true,
      watchOnce: true,
    },
  });

  if (!message?.videoUrl) return null;

  if (message.watchOnce) {
    const done = await prisma.memberVideoCompletion.findUnique({
      where: { userId_messageId: { userId, messageId: message.id } },
    });
    if (done) return null;
  }

  return {
    id: message.id,
    title: message.title,
    caption: message.caption,
    videoUrl: message.videoUrl,
  };
}
