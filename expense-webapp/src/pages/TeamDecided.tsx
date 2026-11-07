import type { ReactElement } from "react";
import { ScreenShell } from "./ScreenShell";

// Empty shell: a later item fills this screen.
export function TeamDecidedPage(): ReactElement {
  return <ScreenShell title="Decided claims" />;
}
