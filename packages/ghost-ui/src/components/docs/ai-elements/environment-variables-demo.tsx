"use client";

import {
  EnvironmentVariable,
  EnvironmentVariableCopyButton,
  EnvironmentVariableGroup,
  EnvironmentVariableName,
  EnvironmentVariableRequired,
  EnvironmentVariables,
  EnvironmentVariablesContent,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariableValue,
} from "@/components/ai-elements/environment-variables";

export function EnvironmentVariablesDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <EnvironmentVariables>
        <EnvironmentVariablesHeader>
          <EnvironmentVariablesTitle />
          <EnvironmentVariablesToggle />
        </EnvironmentVariablesHeader>
        <EnvironmentVariablesContent>
          <EnvironmentVariable
            name="DATABASE_URL"
            value="postgresql://user:pass@localhost:5432/mydb"
          >
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableRequired />
            </EnvironmentVariableGroup>
            <EnvironmentVariableGroup>
              <EnvironmentVariableValue />
              <EnvironmentVariableCopyButton />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
          <EnvironmentVariable
            name="API_KEY"
            value="sk-proj-abc123def456ghi789"
          >
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
              <EnvironmentVariableRequired />
            </EnvironmentVariableGroup>
            <EnvironmentVariableGroup>
              <EnvironmentVariableValue />
              <EnvironmentVariableCopyButton />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
          <EnvironmentVariable name="NODE_ENV" value="production">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
            </EnvironmentVariableGroup>
            <EnvironmentVariableGroup>
              <EnvironmentVariableValue />
              <EnvironmentVariableCopyButton />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
          <EnvironmentVariable name="REDIS_URL" value="redis://localhost:6379">
            <EnvironmentVariableGroup>
              <EnvironmentVariableName />
            </EnvironmentVariableGroup>
            <EnvironmentVariableGroup>
              <EnvironmentVariableValue />
              <EnvironmentVariableCopyButton />
            </EnvironmentVariableGroup>
          </EnvironmentVariable>
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    </div>
  );
}
