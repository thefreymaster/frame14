import { Slider as ChakraSlider, For, HStack } from "@chakra-ui/react";
import * as React from "react";

export interface SliderProps extends ChakraSlider.RootProps {
  marks?: Array<number | { value: number; label: React.ReactNode }>;
  label?: React.ReactNode;
  showValue?: boolean;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider(props, ref) {
    const { marks: marksProp, label, showValue, ...rest } = props;
    const value = props.defaultValue ?? props.value;

    const marks = marksProp?.map((mark) => {
      if (typeof mark === "number") return { value: mark, label: undefined };
      return mark;
    });

    const hasMarkLabel = !!marks?.some((mark) => mark.label);

    return (
      <ChakraSlider.Root ref={ref} thumbAlignment="center" {...rest}>
        {label && !showValue && (
          <ChakraSlider.Label>{label}</ChakraSlider.Label>
        )}
        {label && showValue && (
          <HStack justify="space-between">
            <ChakraSlider.Label>{label}</ChakraSlider.Label>
            <ChakraSlider.ValueText />
          </HStack>
        )}
        <ChakraSlider.Control data-has-mark-label={hasMarkLabel || undefined}>
          <ChakraSlider.Track>
            <ChakraSlider.Range />
          </ChakraSlider.Track>
          <SliderThumbs value={value} />
          <SliderMarks marks={marks} vertical={rest.orientation === "vertical"} />
        </ChakraSlider.Control>
      </ChakraSlider.Root>
    );
  },
);

function SliderThumbs(props: { value?: number[] }) {
  const { value } = props;
  return (
    <For each={value}>
      {(_, index) => (
        <ChakraSlider.Thumb key={index} index={index}>
          <ChakraSlider.HiddenInput />
        </ChakraSlider.Thumb>
      )}
    </For>
  );
}

interface SliderMarksProps {
  marks?: Array<number | { value: number; label: React.ReactNode }>;
  vertical?: boolean;
}

// The marks sit where the thumb's centre stops (0.144.1): Chakra's recipe
// insets the marker group a few px from each end of the track along its
// axis (`--slider-marker-inset`, so an end dot stays inside the rounded
// end), while the thumb's offsets run the control's whole length — so a
// mark at either end sat 4px off the thumb over it (the user: "the fan
// sliders dots are not centered"). With the inset gone, both share the
// control's length, whatever the thumb alignment.
const SliderMarks = React.forwardRef<HTMLDivElement, SliderMarksProps>(
  function SliderMarks(props, ref) {
    const { marks, vertical = false } = props;
    if (!marks?.length) return null;

    return (
      <ChakraSlider.MarkerGroup
        ref={ref}
        insetInline={vertical ? undefined : "0"}
        insetBlock={vertical ? "0" : undefined}
      >
        {marks.map((mark, index) => {
          const value = typeof mark === "number" ? mark : mark.value;
          const label = typeof mark === "number" ? undefined : mark.label;
          return (
            <ChakraSlider.Marker key={index} value={value}>
              <ChakraSlider.MarkerIndicator />
              {label}
            </ChakraSlider.Marker>
          );
        })}
      </ChakraSlider.MarkerGroup>
    );
  },
);
