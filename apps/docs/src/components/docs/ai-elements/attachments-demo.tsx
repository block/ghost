"use client";

import {
  Attachment,
  AttachmentEmpty,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "ghost-ui";

const mockAttachments = [
  {
    id: "1",
    type: "file" as const,
    mediaType: "image/png",
    filename: "screenshot.png",
    url: "https://picsum.photos/seed/attach1/200/200",
  },
  {
    id: "2",
    type: "file" as const,
    mediaType: "application/pdf",
    filename: "quarterly-report.pdf",
    url: "",
  },
  {
    id: "3",
    type: "file" as const,
    mediaType: "audio/mp3",
    filename: "recording.mp3",
    url: "",
  },
];

export function AttachmentsDemo() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Grid variant</p>
        <Attachments variant="grid">
          {mockAttachments.map((file) => (
            <Attachment key={file.id} data={file} onRemove={() => {}}>
              <AttachmentPreview />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Inline variant</p>
        <Attachments variant="inline">
          {mockAttachments.map((file) => (
            <Attachment key={file.id} data={file} onRemove={() => {}}>
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">List variant</p>
        <Attachments variant="list">
          {mockAttachments.map((file) => (
            <Attachment key={file.id} data={file} onRemove={() => {}}>
              <AttachmentPreview />
              <AttachmentInfo showMediaType />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Empty state</p>
        <AttachmentEmpty />
      </div>
    </div>
  );
}
