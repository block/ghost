"use client";

import {
  Commit,
  CommitActions,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitContent,
  CommitCopyButton,
  CommitFile,
  CommitFileAdditions,
  CommitFileChanges,
  CommitFileDeletions,
  CommitFileIcon,
  CommitFileInfo,
  CommitFilePath,
  CommitFileStatus,
  CommitFiles,
  CommitHash,
  CommitHeader,
  CommitInfo,
  CommitMessage,
  CommitMetadata,
  CommitSeparator,
  CommitTimestamp,
} from "@ghost/ui";

export function CommitDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <Commit>
        <CommitHeader>
          <CommitAuthor>
            <CommitAuthorAvatar initials="NK" />
          </CommitAuthor>
          <CommitInfo>
            <CommitMessage>
              feat: add user authentication with OAuth2 support
            </CommitMessage>
            <CommitMetadata>
              <CommitHash>a1b2c3d</CommitHash>
              <CommitSeparator />
              <CommitTimestamp date={new Date("2026-03-27T12:00:00Z")} />
            </CommitMetadata>
          </CommitInfo>
          <CommitActions>
            <CommitCopyButton hash="a1b2c3d4e5f6" />
          </CommitActions>
        </CommitHeader>
        <CommitContent>
          <CommitFiles>
            <CommitFile>
              <CommitFileInfo>
                <CommitFileStatus status="added" />
                <CommitFileIcon />
                <CommitFilePath>src/lib/auth/oauth.ts</CommitFilePath>
              </CommitFileInfo>
              <CommitFileChanges>
                <CommitFileAdditions count={142} />
                <CommitFileDeletions count={0} />
              </CommitFileChanges>
            </CommitFile>
            <CommitFile>
              <CommitFileInfo>
                <CommitFileStatus status="modified" />
                <CommitFileIcon />
                <CommitFilePath>src/middleware.ts</CommitFilePath>
              </CommitFileInfo>
              <CommitFileChanges>
                <CommitFileAdditions count={23} />
                <CommitFileDeletions count={5} />
              </CommitFileChanges>
            </CommitFile>
            <CommitFile>
              <CommitFileInfo>
                <CommitFileStatus status="deleted" />
                <CommitFileIcon />
                <CommitFilePath>src/lib/auth/legacy.ts</CommitFilePath>
              </CommitFileInfo>
              <CommitFileChanges>
                <CommitFileAdditions count={0} />
                <CommitFileDeletions count={87} />
              </CommitFileChanges>
            </CommitFile>
            <CommitFile>
              <CommitFileInfo>
                <CommitFileStatus status="renamed" />
                <CommitFileIcon />
                <CommitFilePath>src/config/auth.config.ts</CommitFilePath>
              </CommitFileInfo>
              <CommitFileChanges>
                <CommitFileAdditions count={8} />
                <CommitFileDeletions count={3} />
              </CommitFileChanges>
            </CommitFile>
          </CommitFiles>
        </CommitContent>
      </Commit>

      <Commit>
        <CommitHeader>
          <CommitAuthor>
            <CommitAuthorAvatar initials="JD" />
          </CommitAuthor>
          <CommitInfo>
            <CommitMessage>
              fix: resolve race condition in data fetching
            </CommitMessage>
            <CommitMetadata>
              <CommitHash>f8e9d0c</CommitHash>
              <CommitSeparator />
              <CommitTimestamp date={new Date("2026-03-29T11:00:00Z")} />
            </CommitMetadata>
          </CommitInfo>
          <CommitActions>
            <CommitCopyButton hash="f8e9d0c1b2a3" />
          </CommitActions>
        </CommitHeader>
      </Commit>
    </div>
  );
}
