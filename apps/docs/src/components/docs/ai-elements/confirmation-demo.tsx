"use client";

import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@ghost/ui";

export function ConfirmationDemo() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Approval requested</p>
        <Confirmation approval={{ id: "1" }} state="approval-requested">
          <ConfirmationTitle>
            The assistant wants to execute <code>rm -rf ./build</code>
          </ConfirmationTitle>
          <ConfirmationRequest>
            <p className="text-muted-foreground text-sm">
              This action will delete the build directory. Do you want to
              proceed?
            </p>
          </ConfirmationRequest>
          <ConfirmationActions>
            <ConfirmationAction variant="outline">Deny</ConfirmationAction>
            <ConfirmationAction>Approve</ConfirmationAction>
          </ConfirmationActions>
        </Confirmation>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Accepted</p>
        <Confirmation
          approval={{ id: "2", approved: true }}
          state="output-available"
        >
          <ConfirmationTitle>
            Executed <code>rm -rf ./build</code>
          </ConfirmationTitle>
          <ConfirmationAccepted>
            <p className="text-muted-foreground text-sm">
              Action was approved and completed successfully.
            </p>
          </ConfirmationAccepted>
        </Confirmation>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Rejected</p>
        <Confirmation
          approval={{ id: "3", approved: false, reason: "Too risky" }}
          state="output-denied"
        >
          <ConfirmationTitle>
            Blocked <code>rm -rf ./build</code>
          </ConfirmationTitle>
          <ConfirmationRejected>
            <p className="text-muted-foreground text-sm">
              Action was denied by the user.
            </p>
          </ConfirmationRejected>
        </Confirmation>
      </div>
    </div>
  );
}
