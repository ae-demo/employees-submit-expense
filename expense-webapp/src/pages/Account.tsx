import { useEffect, useState, type ReactElement } from "react";
import { Card, CardContent, CardHeader, Grid, Typography } from "@wso2/oxygen-ui";
import { useAuthz, useHeldRoles } from "../authz/gates";
import { currentUser } from "../authz/session";
import { ScreenShell } from "./ScreenShell";

function Field({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Grid>
  );
}

export function AccountPage(): ReactElement {
  const { username } = useAuthz();
  const roles = useHeldRoles();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void currentUser().then((u) => setEmail(u?.profile.email ?? ""));
  }, []);

  return (
    <ScreenShell title="Account">
      <Card variant="outlined">
        <CardHeader title="Account" />
        <CardContent>
          <Grid container spacing={2}>
            <Field label="Name" value={username} />
            <Field label="Email" value={email} />
            <Field label="Signed in as" value={roles.join(", ")} />
          </Grid>
        </CardContent>
      </Card>
    </ScreenShell>
  );
}
