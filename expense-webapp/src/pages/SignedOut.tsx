import type { ReactElement } from "react";
import { Box, Button, Layout, ParticleBackground, Stack, Typography } from "@wso2/oxygen-ui";
import { signIn } from "../authz/session";

/** Public screen on the bare gate layout: reachable before sign-in. */
export function SignedOutPage(): ReactElement {
  return (
    <Layout.Content>
      <ParticleBackground opacity={0.5} />
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Stack spacing={2} alignItems="center" sx={{ zIndex: 1 }}>
          <Typography variant="h4">You are signed out</Typography>
          <Button variant="contained" onClick={() => void signIn()}>
            Sign in
          </Button>
        </Stack>
      </Box>
    </Layout.Content>
  );
}
