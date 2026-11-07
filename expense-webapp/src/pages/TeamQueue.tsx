import type { ReactElement } from "react";
import { ScreenShell } from "./ScreenShell";

// Empty shell: a later item fills this screen.
export function TeamQueuePage(): ReactElement {
  return <ScreenShell title="Team approvals" />;
}
