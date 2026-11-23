import { Box, HStack, Icon, Link, Stack, Text } from "@chakra-ui/react";
import { IoOpenOutline } from "react-icons/io5";
import { useNow } from "../hooks/useNow";
import { isKiosk } from "../lib/kiosk";
import { timeAgo, type StockHeadline } from "../lib/stocks";

/**
 * The week's news of a ticker, in its drawer (0.180.0): each headline over
 * its source and how long ago, the newest first.
 *
 * On a phone or a desktop a headline is a link to its article, in a new tab
 * (only an https address reaches here: stocks.js). **On the wall's frame it
 * is text**: Fully Kiosk has no tabs, and a tap would take the wall off the
 * dashboard (lib/kiosk). No pictures: a headline's image is on whatever host
 * its publisher uses.
 */
export function StockNews({ news }: { news: readonly StockHeadline[] }) {
  // "25m ago" moves while the drawer is open.
  const now = useNow(60_000);
  const links = !isKiosk();
  return (
    <Stack as="ul" gap="0" listStyleType="none" data-stock-news="">
      {news.map((item, i) => {
        const meta = [item.source, timeAgo(item.at, now)].filter(Boolean).join(" · ");
        const linked = links && item.url != null;
        const words = (
          <HStack gap="3" align="start">
            <Stack gap="0.5" flex="1" minW="0">
              <Text textStyle="sm" fontWeight="medium" lineClamp={3} data-stock-headline="">
                {item.headline}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                {meta}
              </Text>
            </Stack>
            {linked && (
              <Icon color="fg.muted" boxSize="4" mt="0.5" flexShrink="0" aria-hidden="true">
                <IoOpenOutline />
              </Icon>
            )}
          </HStack>
        );
        return (
          <Box
            as="li"
            key={`${item.at}:${item.headline}`}
            pt={i === 0 ? "0" : "2.5"}
            pb={i === news.length - 1 ? "0" : "2.5"}
            borderTopWidth={i === 0 ? "0" : "1px"}
            borderColor="border"
          >
            {linked ? (
              <Link
                href={item.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                display="block"
                color="inherit"
                _hover={{ textDecoration: "none", "& [data-stock-headline]": { textDecoration: "underline" } }}
              >
                {words}
              </Link>
            ) : (
              words
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
