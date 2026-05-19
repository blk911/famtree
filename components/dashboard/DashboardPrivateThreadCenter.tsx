"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { EmptyThreadState } from "@/components/vault/EmptyThreadState";
import { ThreadComposer } from "@/components/vault/ThreadComposer";
import { PostCard } from "@/components/PostCard";
import { directThreadKey } from "@/lib/private-thread-keys";
import { postScopeShareLabel } from "@/lib/posts/scope-labels";
import { checkBrowserPostMediaFile } from "@/lib/media/image-sniff";
import { BROWSER_POST_MEDIA_ACCEPT } from "@/lib/media/upload-limits";
import { preparePostMediaForSubmit } from "@/lib/posts/upload-post-media-client";
import {
  buildPrivateThreads,
  type PrivateFeedPost,
  type PrivateMember,
  type PrivateThread,
  type TrustUnitRow,
  peerIdFromDirectThread,
} from "@/components/dashboard/private-thread-model";

const COMPOSE_BG: Record<PrivateThread["type"], { bg: string; border: string }> = {
  tu: { bg: "#faf5ff", border: "#e9d5ff" },
  direct: { bg: "#eff6ff", border: "#bfdbfe" },
  group: { bg: "#f0fdf4", border: "#bbf7d0" },
};

type Props = {
  currentUserId: string;
  trustUnits: TrustUnitRow[];
  posts: PrivateFeedPost[];
  members: PrivateMember[];
  bondPeers: PrivateMember[];
  selectedThreadKey: string | null;
  launchDmPeerId?: string | null;
  onLaunchDmPeerConsumed?: () => void;
  onActiveDirectPeerChange?: (peerId: string | null) => void;
  onSelectedThreadKeyChange?: (key: string | null) => void;
};

export function DashboardPrivateThreadCenter({
  currentUserId,
  trustUnits,
  posts,
  members,
  bondPeers,
  selectedThreadKey,
  launchDmPeerId = null,
  onLaunchDmPeerConsumed,
  onActiveDirectPeerChange,
  onSelectedThreadKeyChange,
}: Props) {
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const seedDmPeers = useMemo(() => {
    const byId = new Map(bondPeers.map((p) => [p.id, p]));
    if (launchDmPeerId && launchDmPeerId !== currentUserId) {
      const m = memberMap.get(launchDmPeerId);
      if (m) byId.set(m.id, m);
    }
    return Array.from(byId.values());
  }, [bondPeers, launchDmPeerId, memberMap, currentUserId]);

  const [allItems, setAllItems] = useState<PrivateFeedPost[]>(posts);

  useEffect(() => {
    setAllItems(posts);
  }, [posts]);

  const threads = useMemo(
    () =>
      buildPrivateThreads(allItems, trustUnits, memberMap, currentUserId, seedDmPeers),
    [allItems, trustUnits, memberMap, currentUserId, seedDmPeers],
  );

  const activeThread = useMemo(() => {
    if (!selectedThreadKey) return null;
    const found = threads.find((t) => t.key === selectedThreadKey);
    if (found) return found;

    const memberIds = selectedThreadKey.split(",");
    if (!memberIds.includes(currentUserId)) return null;

    const tu = trustUnits.find((u) => {
      const key = u.members
        .map((m) => m.user.id)
        .sort()
        .join(",");
      return key === selectedThreadKey;
    });
    if (tu) {
      return {
        key: selectedThreadKey,
        type: "tu" as const,
        label: tu.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(" · "),
        memberIds: tu.members.map((m) => m.user.id),
        posts: [],
        unit: tu,
      };
    }

    const otherIds = memberIds.filter((id) => id !== currentUserId);
    if (otherIds.length === 1) {
      const peer = memberMap.get(otherIds[0]!);
      if (peer) {
        return {
          key: selectedThreadKey,
          type: "direct" as const,
          label: `${peer.firstName} ${peer.lastName}`,
          memberIds,
          posts: [],
        };
      }
    }

    return null;
  }, [threads, selectedThreadKey, currentUserId, trustUnits, memberMap]);

  useEffect(() => {
    if (!launchDmPeerId || launchDmPeerId === currentUserId) return;
    const k = directThreadKey(launchDmPeerId, currentUserId);
    onSelectedThreadKeyChange?.(k);
    onLaunchDmPeerConsumed?.();
  }, [launchDmPeerId, currentUserId, onLaunchDmPeerConsumed, onSelectedThreadKeyChange]);

  useEffect(() => {
    if (!onActiveDirectPeerChange) return;
    if (!activeThread) {
      onActiveDirectPeerChange(null);
      return;
    }
    onActiveDirectPeerChange(peerIdFromDirectThread(activeThread, currentUserId));
  }, [activeThread, currentUserId, onActiveDirectPeerChange]);

  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset compose when switching threads
  }, [selectedThreadKey]);

  const handleDelete = async (postId: string) => {
    await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
    setAllItems((cur) => cur.filter((p) => p.id !== postId));
  };

  const handleImageSelect = (file: File) => {
    void (async () => {
      const r = await checkBrowserPostMediaFile(file);
      if (!r.ok) {
        setMediaError(r.error);
        return;
      }
      setMediaError(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    })();
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const postToThread = async (
    visibleTo: string[],
    body: string,
    file?: File | null,
  ): Promise<PrivateFeedPost | null> => {
    let blobAttachmentUrl: string | undefined;
    let multipartFile: File | null | undefined = file ?? null;

    if (multipartFile) {
      try {
        const prepared = await preparePostMediaForSubmit(multipartFile);
        if (prepared.kind === "blob") {
          blobAttachmentUrl = prepared.url;
          multipartFile = null;
        }
      } catch {
        return null;
      }
    }

    const resolvedImageUrl = (blobAttachmentUrl ?? "").trim() || undefined;

    let res: Response;
    if (multipartFile) {
      const fd = new FormData();
      fd.append("body", body);
      fd.append("scope", "PRIVATE");
      fd.append("image", multipartFile);
      fd.append("visibleTo", JSON.stringify(visibleTo));
      res = await fetch("/api/profile/posts", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/profile/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          visibleTo,
          scope: "PRIVATE",
          ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
        }),
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.post as PrivateFeedPost;
    return {
      ...raw,
      createdAt: new Date(raw.createdAt).toISOString(),
      visibility: raw.visibility ?? visibleTo.map((userId) => ({ userId })),
    };
  };

  const handleSubmit = async (thread: PrivateThread) => {
    const body = draft.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    const visibleTo = thread.memberIds.filter((id) => id !== currentUserId);
    const newPost = await postToThread(visibleTo, body, imageFile);
    if (newPost) {
      setAllItems((cur) => [newPost, ...cur]);
      setDraft("");
      clearImage();
    }
    setSubmitting(false);
  };

  if (!selectedThreadKey || !activeThread) {
    return <EmptyThreadState variant="pick" />;
  }

  const { bg, border } = COMPOSE_BG[activeThread.type];

  return (
    <div className="thread-active-panel">
      <header className="thread-active-panel__header">
        <h3 className="thread-active-panel__title">{activeThread.label}</h3>
        <span
          className={`thread-active-panel__badge thread-active-panel__badge--${activeThread.type}`}
        >
          {activeThread.type === "tu"
            ? "Trust Unit"
            : activeThread.type === "direct"
              ? "Direct"
              : "Group"}
        </span>
      </header>

      <ThreadComposer
        value={draft}
        onChange={setDraft}
        onSubmit={() => handleSubmit(activeThread)}
        placeholder={
          activeThread.type === "tu"
            ? `Message Trust Unit · ${activeThread.label}…`
            : `Message ${activeThread.label}…`
        }
        submitting={submitting}
        error={mediaError}
        tint={{ bg, border }}
        footer={
          <ThreadComposeMediaFooter
            imagePreview={imagePreview}
            imageFile={imageFile}
            imageInputRef={imageInputRef}
            onClearImage={clearImage}
            onImageSelect={handleImageSelect}
          />
        }
      />

      {activeThread.posts.length === 0 ? (
        <EmptyThreadState variant="no-messages" />
      ) : (
        <div className="space-y-3">
          {activeThread.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              canDelete={post.profile.user.id === currentUserId}
              onDelete={handleDelete}
              shareScope={postScopeShareLabel(post.scope ?? "PRIVATE")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadComposeMediaFooter(props: {
  imagePreview: string | null;
  imageFile: File | null;
  imageInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onClearImage: () => void;
  onImageSelect: (file: File) => void;
}) {
  const { imagePreview, imageFile, imageInputRef, onClearImage, onImageSelect } = props;

  return (
    <div className="flex items-center gap-2">
      {imagePreview && (
        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-stone-100">
          {imageFile?.type.startsWith("video/") ? (
            <video src={imagePreview} muted playsInline className="h-full w-full object-cover" />
          ) : (
            <img src={imagePreview} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={onClearImage}
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
            style={{ fontSize: 12 }}
          >
            ×
          </button>
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept={BROWSER_POST_MEDIA_ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onImageSelect(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        Photo / video
      </button>
    </div>
  );
}
