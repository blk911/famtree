"use client";

import { FileText, Film } from "lucide-react";
import type { MsgAttachmentDTO } from "@/types/msg-vault/attachment";
import { MsgAttachmentKind } from "@/types/msg-vault/attachment";

export function MessageAttachmentBubble({
  attachment,
  mine,
}: {
  attachment: MsgAttachmentDTO;
  mine: boolean;
}) {
  if (attachment.kind === MsgAttachmentKind.IMAGE) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-h-56 max-w-full rounded-xl object-cover"
        />
      </a>
    );
  }

  if (attachment.kind === MsgAttachmentKind.VIDEO) {
    return (
      <div className="overflow-hidden rounded-xl bg-stone-900/90">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-stone-300">
          <Film className="h-3 w-3" />
          Video
        </div>
        <video
          src={attachment.url}
          controls
          playsInline
          className="max-h-48 w-full"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium no-underline ${
        mine ? "bg-indigo-500/30 text-white" : "bg-stone-100 text-stone-800 ring-1 ring-stone-200/80"
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{attachment.fileName}</span>
    </a>
  );
}
