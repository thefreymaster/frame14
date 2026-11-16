import { Switch as ChakraSwitch } from "@chakra-ui/react";
import * as React from "react";

// Not in React's input attributes yet.
const NATIVE_SWITCH = { switch: "" } as React.InputHTMLAttributes<HTMLInputElement>;

export interface SwitchProps extends ChakraSwitch.RootProps {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  rootRef?: React.RefObject<HTMLLabelElement | null>;
  trackLabel?: { on: React.ReactNode; off: React.ReactNode };
  thumbLabel?: { on: React.ReactNode; off: React.ReactNode };
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(props, ref) {
    const { inputProps, children, rootRef, trackLabel, thumbLabel, ...rest } =
      props;

    return (
      <ChakraSwitch.Root ref={rootRef} {...rest}>
        {/* `switch` makes it a real switch to Safari, which ticks an iPhone's
            Taptic Engine as a tap on its label toggles it (lib/haptics);
            other browsers know no such attribute. */}
        <ChakraSwitch.HiddenInput ref={ref} {...inputProps} {...NATIVE_SWITCH} />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb>
            {thumbLabel && (
              <ChakraSwitch.ThumbIndicator fallback={thumbLabel?.off}>
                {thumbLabel?.on}
              </ChakraSwitch.ThumbIndicator>
            )}
          </ChakraSwitch.Thumb>
          {trackLabel && (
            <ChakraSwitch.Indicator fallback={trackLabel.off}>
              {trackLabel.on}
            </ChakraSwitch.Indicator>
          )}
        </ChakraSwitch.Control>
        {children != null && (
          <ChakraSwitch.Label>{children}</ChakraSwitch.Label>
        )}
      </ChakraSwitch.Root>
    );
  },
);
