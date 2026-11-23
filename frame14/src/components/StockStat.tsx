import { Stack, Text } from "@chakra-ui/react";

/**
 * One figure of a ticker's drawer under its name (0.180.0): a company's
 * market value, a key number. Plain tabular figures.
 */
export function StockStat({ label, value, name }: { label: string; value: string; name: string }) {
  return (
    <Stack gap="0" minW="0">
      <Text textStyle="xs" color="fg.muted">
        {label}
      </Text>
      <Text textStyle="md" fontVariantNumeric="tabular-nums" data-stock-stat={name}>
        {value}
      </Text>
    </Stack>
  );
}
