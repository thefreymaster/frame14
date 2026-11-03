"use client";

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "top-end",
  pauseOnPageIdle: true,
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
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
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
