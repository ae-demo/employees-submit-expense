import { useEffect, useRef, useState, type ReactElement } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/** /callback: finishes the redirect (or silent renew) leg once, then lands on the app root. */
export function CallbackPage(): ReactElement {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    handleCallback()
      .then(() => window.location.replace(window.location.origin))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed"));
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">Signing you in…</Typography>
        </Stack>
      )}
    </Box>
  );
}
