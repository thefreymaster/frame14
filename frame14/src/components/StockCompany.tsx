import { useState } from "react";
import { Flex, Image, Stack, Text } from "@chakra-ui/react";
import { fmtMarketValue, type StockCompany as Company } from "../lib/stocks";
import { StockStat } from "./StockStat";

/**
 * The company behind a ticker, in its drawer (0.180.0): its logo, its name
 * over its industry and exchange, and what the market values it at. An ETF
 * has none of it, and no such section.
 *
 * The logo comes straight from Finnhub's static host (stocks.js keeps the
 * address only if it is one of them, https), as a container's icon comes from
 * its registry (UnraidGuestTile): the page's own address isn't sent with the
 * request, and a logo that doesn't load is left out. On a white plate — the
 * logos are drawn for one.
 */
export function StockCompany({ company }: { company: Company }) {
  const [broken, setBroken] = useState<string | null>(null);
  const facts = [company.industry, company.exchange].filter(Boolean).join(" · ");
  return (
    <Flex align="center" gap="3" wrap="wrap" data-stock-company="">
      {company.logo && broken !== company.logo && (
        <Image
          src={company.logo}
          alt=""
          boxSize="10"
          flexShrink="0"
          objectFit="contain"
          rounded="sm"
          bg="white"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(company.logo)}
          data-stock-logo=""
        />
      )}
      <Stack gap="0" flex="1" minW="8rem">
        <Text textStyle="lg" fontWeight="semibold" data-stock-company-name="">
          {company.name}
        </Text>
        {facts && (
          <Text textStyle="sm" color="fg.muted" data-stock-company-facts="">
            {facts}
          </Text>
        )}
      </Stack>
      {company.marketValue != null && (
        <StockStat label="Market value" value={fmtMarketValue(company.marketValue)} name="market-value" />
      )}
    </Flex>
  );
}
