"use client";

import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from "ghost-ui";

export function TaskDemo() {
  return (
    <div className="space-y-4">
      <Task defaultOpen>
        <TaskTrigger title="Searched 5 files for authentication logic" />
        <TaskContent>
          <TaskItem>
            Found <TaskItemFile>src/auth/login.ts</TaskItemFile> — contains the
            main login handler with JWT token generation.
          </TaskItem>
          <TaskItem>
            Found <TaskItemFile>src/middleware/auth.ts</TaskItemFile> —
            validates tokens on protected routes.
          </TaskItem>
          <TaskItem>
            Found <TaskItemFile>src/lib/session.ts</TaskItemFile> — manages
            session creation and expiration.
          </TaskItem>
        </TaskContent>
      </Task>

      <Task>
        <TaskTrigger title="Analyzed database schema" />
        <TaskContent>
          <TaskItem>
            Reviewed <TaskItemFile>prisma/schema.prisma</TaskItemFile> for user
            model relationships.
          </TaskItem>
        </TaskContent>
      </Task>
    </div>
  );
}
