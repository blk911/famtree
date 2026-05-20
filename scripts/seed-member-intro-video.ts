/**
 * Seeds the dashboard intro video repository row (dev / test prod).
 * Usage: npx tsx scripts/seed-member-intro-video.ts
 */
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_MEMBER_VIDEO_SLUG } from "@/lib/admin/memberVideoMessages";

const VIDEO_PATH = "/uploads/admin-site-wide-intro.mp4";

async function main() {
  const founder = await prisma.user.findFirst({
    where: { role: { in: ["founder", "admin"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  if (!founder) {
    console.error("No founder/admin user found. Run db:seed first.");
    process.exit(1);
  }

  await prisma.memberVideoMessage.updateMany({
    where: { slug: DEFAULT_MEMBER_VIDEO_SLUG },
    data: { isEnabled: false },
  });

  const existing = await prisma.memberVideoMessage.findFirst({
    where: { slug: DEFAULT_MEMBER_VIDEO_SLUG, videoUrl: VIDEO_PATH },
    orderBy: { createdAt: "desc" },
  });

  const row = existing
    ? await prisma.memberVideoMessage.update({
        where: { id: existing.id },
        data: {
          title: "Welcome from your family steward",
          caption: "Watch Once",
          notes: "45s HeyGen intro · admin-site-wide-intro.mp4",
          isEnabled: true,
        },
      })
    : await prisma.memberVideoMessage.create({
        data: {
          slug: DEFAULT_MEMBER_VIDEO_SLUG,
          title: "Welcome from your family steward",
          caption: "Watch Once",
          videoUrl: VIDEO_PATH,
          notes: "45s HeyGen intro · admin-site-wide-intro.mp4",
          isEnabled: true,
          createdById: founder.id,
        },
      });

  if (existing) {
    await prisma.memberVideoMessage.update({
      where: { id: row.id },
      data: { isEnabled: true },
    });
  }

  console.log("Member intro video ready:", {
    id: row.id,
    videoUrl: VIDEO_PATH,
    enabled: true,
    createdBy: founder.email,
  });
  console.log("Ensure MEMBER_VIDEO_GATE_ENABLED=true in .env");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
