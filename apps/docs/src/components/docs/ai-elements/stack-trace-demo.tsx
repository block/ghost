"use client";

import {
  StackTrace,
  StackTraceActions,
  StackTraceContent,
  StackTraceCopyButton,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceExpandButton,
  StackTraceFrames,
  StackTraceHeader,
} from "ghost-ui";

const typeErrorTrace = `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (/src/components/UserList.tsx:24:18)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:17811:13)
    at beginWork (node_modules/react-dom/cjs/react-dom.development.js:19049:16)
    at HTMLUnknownElement.callCallback (node_modules/react-dom/cjs/react-dom.development.js:3945:14)`;

const referenceErrorTrace = `ReferenceError: fetchData is not defined
    at loadDashboard (/src/pages/dashboard.ts:15:3)
    at async handleRequest (/src/server/router.ts:42:12)
    at async processMiddleware (/src/server/middleware.ts:28:5)
    at node:internal/process/task_queues:95:5`;

export function StackTraceDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <StackTrace trace={typeErrorTrace} defaultOpen>
        <StackTraceHeader>
          <StackTraceError>
            <StackTraceErrorType />
            <StackTraceErrorMessage />
          </StackTraceError>
          <StackTraceActions>
            <StackTraceCopyButton />
            <StackTraceExpandButton />
          </StackTraceActions>
        </StackTraceHeader>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>

      <StackTrace trace={referenceErrorTrace}>
        <StackTraceHeader>
          <StackTraceError>
            <StackTraceErrorType />
            <StackTraceErrorMessage />
          </StackTraceError>
          <StackTraceActions>
            <StackTraceCopyButton />
            <StackTraceExpandButton />
          </StackTraceActions>
        </StackTraceHeader>
        <StackTraceContent>
          <StackTraceFrames showInternalFrames={false} />
        </StackTraceContent>
      </StackTrace>
    </div>
  );
}
