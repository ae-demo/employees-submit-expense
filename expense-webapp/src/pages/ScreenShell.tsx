import type { ReactElement, ReactNode } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

/** Page anatomy every screen shares: PageContent > PageTitle > content. */
export function ScreenShell({ title, children }: { title: string; children?: ReactNode }): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>{title}</PageTitle.Header>
      </PageTitle>
      {children}
    </PageContent>
  );
}
