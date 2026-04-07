"use client";

import {
  Test,
  TestError,
  TestErrorMessage,
  TestErrorStack,
  TestResults,
  TestResultsContent,
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummary,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
} from "@/components/ai-elements/test-results";

export function TestResultsDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <TestResults
        summary={{
          passed: 18,
          failed: 2,
          skipped: 1,
          total: 21,
          duration: 4230,
        }}
      >
        <TestResultsHeader>
          <TestResultsSummary />
          <TestResultsDuration />
        </TestResultsHeader>
        <TestResultsContent>
          <TestResultsProgress />

          <TestSuite name="Authentication" status="passed" defaultOpen>
            <TestSuiteName />
            <TestSuiteContent>
              <Test
                name="should login with valid credentials"
                status="passed"
                duration={45}
              />
              <Test
                name="should reject invalid password"
                status="passed"
                duration={32}
              />
              <Test
                name="should handle OAuth callback"
                status="passed"
                duration={120}
              />
              <Test
                name="should refresh expired tokens"
                status="passed"
                duration={89}
              />
            </TestSuiteContent>
          </TestSuite>

          <TestSuite name="User API" status="failed" defaultOpen>
            <TestSuiteName />
            <TestSuiteContent>
              <Test
                name="should create a new user"
                status="passed"
                duration={67}
              />
              <Test
                name="should return 404 for unknown user"
                status="passed"
                duration={23}
              />
              <Test
                name="should update user profile"
                status="failed"
                duration={150}
              >
                <TestError>
                  <TestErrorMessage>
                    Expected status 200 but received 500
                  </TestErrorMessage>
                  <TestErrorStack>
                    {`at Object.<anonymous> (tests/api/user.test.ts:45:10)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`}
                  </TestErrorStack>
                </TestError>
              </Test>
              <Test
                name="should validate email format"
                status="failed"
                duration={12}
              >
                <TestError>
                  <TestErrorMessage>
                    AssertionError: expected &apos;invalid&apos; to match
                    /^[^@]+@[^@]+$/
                  </TestErrorMessage>
                </TestError>
              </Test>
              <Test name="should handle concurrent requests" status="skipped" />
            </TestSuiteContent>
          </TestSuite>

          <TestSuite name="Database" status="passed">
            <TestSuiteName />
            <TestSuiteContent>
              <Test
                name="should connect to database"
                status="passed"
                duration={200}
              />
              <Test
                name="should run migrations"
                status="passed"
                duration={340}
              />
              <Test
                name="should seed test data"
                status="passed"
                duration={180}
              />
            </TestSuiteContent>
          </TestSuite>
        </TestResultsContent>
      </TestResults>
    </div>
  );
}
