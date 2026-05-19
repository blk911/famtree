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
    <div
      className="thread-selector-avatar"
      style={{ width: size, height: size, fontSize: size <= 24 ? 9 : 10 }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" />
      ) : (
        `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
      )}
    </div>
  );
}
