"use client";

import * as React from "react";
import { useActionState } from "react";
import { decideApprovalAction, type ApprovalDecisionState } from "@/app/actions/quotations";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: ApprovalDecisionState = { status: "idle" };

export function ApprovalStepForm({
  quotationId,
  stepId,
  canAct,
}: {
  quotationId: string;
  stepId: string;
  canAct: boolean;
}) {
  const [state, formAction, pending] = useActionState(decideApprovalAction, INITIAL_STATE);
  const { showToast } = useToast();
  const lastMessageRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (state.status === "idle" || !state.message || state.message === lastMessageRef.current) return;
    lastMessageRef.current = state.message;
    showToast({
      title: state.status === "error" ? "Couldn't complete that" : "Quotation updated",
      description: state.message,
      variant: state.variant,
    });
  }, [state, showToast]);

  // Once a decision is submitted this step is no longer the actionable one,
  // so the surrounding page stops asking for this component at all -- but
  // it has to stay mounted anyway, or the state update carrying the toast
  // message never gets to fire its effect before being torn down. Keeping
  // it alive and just rendering nothing is what makes the popup reliable.
  if (!canAct) return null;

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="quotationId" value={quotationId} />
      <Input name="reason" placeholder="Reason (optional)" className="min-w-[160px] flex-1" />
      <Button name="decision" value="APPROVED" size="sm" variant="success" disabled={pending}>
        Approve
      </Button>
      <Button name="decision" value="REJECTED" size="sm" variant="destructive" disabled={pending}>
        Reject
      </Button>
      <Button name="decision" value="RETURNED" size="sm" variant="outline" disabled={pending}>
        Return for Revision
      </Button>
    </form>
  );
}
