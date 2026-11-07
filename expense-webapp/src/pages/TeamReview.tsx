import type { ReactElement } from "react";
import { ScreenShell } from "./ScreenShell";

// Empty shell: a later item fills this screen.
export function TeamReviewPage(): ReactElement {
  return <ScreenShell title="Review claim" />;
}
