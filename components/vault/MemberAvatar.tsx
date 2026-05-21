import { ThreadMemberAvatar } from "@/components/ui/thread";

export function MemberAvatar({
  firstName,
  lastName,
  photoUrl,
  size = 24,
}: {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  size?: number;
}) {
  return (
    <ThreadMemberAvatar style={{ width: size, height: size, fontSize: size <= 24 ? 9 : 10 }}>
      {photoUrl ? (
        <img src={photoUrl} alt="" className="block h-full w-full max-w-none object-cover" />
      ) : (
        `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
      )}
    </ThreadMemberAvatar>
  );
}
