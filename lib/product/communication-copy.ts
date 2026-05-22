/**
 * User-facing communication terminology — see docs/product/communication-model.md.
 * Import these strings in UI; do not use "post" for Msg Vault messages or "message" for feed posts.
 */

export const MSG_VAULT = {
  heroSubtitle: "Private chats, threads, and notices",
  statusChats: "Chats",
  statusThreads: "Threads",
  statusNotices: "Notices",
  listNewChat: "New",
  emptyChats: "No chats yet.",
  emptyThreads: "No threads yet.",
  emptyNotices: "No notices.",
  emptyList: "No conversations yet.",
  startChatPreview: "Start chat",
  selectChat: "Select a chat to begin.",
  selectNotice: "Select a notice.",
  composerPlaceholder: "Write a message…",
  composerClosed: "This chat is closed.",
  composerSendError: "Could not send message.",
  attachHint: "JPG, PNG, WebP, MP4, or PDF",
  archiveChat: "Archive chat",
  resumeChat: "Resume chat",
  archivedSection: "Archived",
  contextPickChat: "Pick a chat to see members and trust context.",
  contextPickThread: "Pick a thread to see members and trust context.",
} as const;

export const DASHBOARD = {
  postComposerPlaceholder: "Share a post…",
  tabPosts: "Posts",
  tabPrivateChats: "Private chats",
  tabMyPosts: "My Posts",
  tabInvites: "Invites",
  panelPrivateChats: "Private chats",
  ctaPostsAction: "See network posts",
  ctaPrivateChatsAction: "Open private chats",
  ctaMsgVaultAction: "Open Msg Vault",
  ctaMsgVaultNotices: "Check notices",
  railPrivateChats: "Private chats",
  railLoadingChats: "Loading chats…",
  railNoChats: "No chats yet. Open Msg Vault to start one.",
  loadingChats: "Loading chats…",
  chatClosed: "This chat is closed.",
} as const;

export const SPACES = {
  postPlaceholder: (spaceLabel: string) => `Post an update in ${spaceLabel}…`,
  postPlaceholderNoSpace: "Select a space above to post an update.",
} as const;
