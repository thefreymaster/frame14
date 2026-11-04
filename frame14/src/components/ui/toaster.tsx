"use client";

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react";
import { NAV_BAR_CLEARANCE } from "../../lib/navMetrics";
import { useNavVisible } from "../../lib/navVisibility";

// Toasts in the bottom-right corner (0.157.0, the user's ask; top-end
// before), 1rem in from the edge — clear of the portrait bottom bar while
// it shows, as the arranging toolbar is. The group's bottom is
// `--toast-bottom`, which the Toaster sets for the screen it's on.
const EDGE = "1rem";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
  offsets: { top: EDGE, right: EDGE, left: EDGE, bottom: "var(--toast-bottom)" },
});

// The colour a toast's type speaks in (0.125): its border and indicator,
// never its whole face — the recipe's solid green / red / orange is undone
// in the theme (components/ui/provider.tsx).
const TYPE_PALETTE: Record<string, string> = {
  success: "green",
  error: "red",
  warning: "orange",
  info: "blue",
  loading: "blue",
};

export const Toaster = () => {
  const navVisible = useNavVisible();
  return (
    <Portal>
      <ChakraToaster
        toaster={toaster}
        insetInline={{ mdDown: "4" }}
        css={{
          "--toast-bottom": EDGE,
          _portrait: {
            "--toast-bottom": navVisible
              ? `calc(${NAV_BAR_CLEARANCE} + ${EDGE})`
              : EDGE,
          },
        }}
      >
        {(toast) => (
          <Toast.Root
            width={{ md: "sm" }}
            colorPalette={TYPE_PALETTE[toast.type ?? ""] ?? "gray"}
          >
            {toast.type === "loading" ? (
              <Spinner size="sm" color="colorPalette.solid" />
            ) : (
              <Toast.Indicator color="colorPalette.solid" />
            )}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {/* Every toast can be put away (0.116.1): the snippet showed
                the close only for `closable` ones. */}
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
};
