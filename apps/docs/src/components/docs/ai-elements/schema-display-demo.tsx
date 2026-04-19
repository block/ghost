"use client";

import { SchemaDisplay } from "@ghost/ui";

export function SchemaDisplayDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <SchemaDisplay
        method="POST"
        path="/api/orgs/{orgId}/users"
        description="Create a new user account within an organization."
        parameters={[
          {
            name: "orgId",
            type: "string",
            required: true,
            location: "path",
            description: "The organization identifier",
          },
        ]}
        requestBody={[
          {
            name: "name",
            type: "string",
            required: true,
            description: "Full name of the user",
          },
          {
            name: "email",
            type: "string",
            required: true,
            description: "Valid email address",
          },
          {
            name: "role",
            type: "enum",
            description: 'One of: "admin", "user", "guest"',
          },
          {
            name: "metadata",
            type: "object",
            description: "Additional user metadata",
            properties: [
              { name: "department", type: "string" },
              { name: "teamId", type: "number" },
            ],
          },
        ]}
        responseBody={[
          {
            name: "id",
            type: "string",
            required: true,
            description: "Unique user ID",
          },
          { name: "name", type: "string", required: true },
          { name: "email", type: "string", required: true },
          {
            name: "createdAt",
            type: "string",
            description: "ISO 8601 timestamp",
          },
        ]}
      />

      <SchemaDisplay
        method="PUT"
        path="/api/orgs/{orgId}/users/{userId}"
        description="Replace all fields on an existing user record."
        parameters={[
          {
            name: "orgId",
            type: "string",
            required: true,
            location: "path",
            description: "The organization identifier",
          },
          {
            name: "userId",
            type: "string",
            required: true,
            location: "path",
            description: "The user to update",
          },
        ]}
        requestBody={[
          {
            name: "name",
            type: "string",
            required: true,
            description: "Full name",
          },
          {
            name: "email",
            type: "string",
            required: true,
            description: "Email address",
          },
          {
            name: "role",
            type: "enum",
            description: 'One of: "admin", "user", "guest"',
          },
        ]}
      />

      <SchemaDisplay
        method="GET"
        path="/api/users/{userId}/posts"
        description="Retrieve all posts for a specific user."
        parameters={[
          {
            name: "userId",
            type: "string",
            required: true,
            location: "path",
            description: "The unique user identifier",
          },
          {
            name: "page",
            type: "number",
            location: "query",
            description: "Page number for pagination",
          },
          {
            name: "limit",
            type: "number",
            location: "query",
            description: "Number of items per page (max 100)",
          },
        ]}
        responseBody={[
          {
            name: "posts",
            type: "array",
            description: "List of user posts",
            items: {
              name: "post",
              type: "object",
              properties: [
                { name: "id", type: "string", required: true },
                { name: "title", type: "string", required: true },
                { name: "publishedAt", type: "string" },
              ],
            },
          },
          {
            name: "total",
            type: "number",
            description: "Total number of posts",
          },
        ]}
      />

      <SchemaDisplay
        method="DELETE"
        path="/api/users/{userId}"
        description="Permanently delete a user and all associated data."
        parameters={[
          {
            name: "userId",
            type: "string",
            required: true,
            location: "path",
            description: "The user ID to delete",
          },
        ]}
      />
    </div>
  );
}
