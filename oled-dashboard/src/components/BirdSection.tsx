import { useEffect, useState } from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { PiBirdFill } from "react-icons/pi";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Board } from "./Board";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity } from "../hooks/useEntity";
import { birdBaseId, birdEntityId } from "../lib/birdEntities";

const UNAVAILABLE = new Set(["unknown", "unavailable", "none", ""]);

function cleanState(value: string | undefined | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (UNAVAILABLE.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function relativeTime(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function BirdSection() {
  const entitiesQuery = useEntitiesConfig();
  const base = birdBaseId(entitiesQuery.data?.bird);
  const species = useEntity(birdEntityId(base, "last_species"));
  const scientific = useEntity(birdEntityId(base, "scientific_name"));
  const confidence = useEntity(birdEntityId(base, "confidence"));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const name = cleanState(species.data?.state);
  if (!base || !name) return null;

  const scientificName = cleanState(scientific.data?.state);
  const confidencePct = (() => {
    const raw = cleanState(confidence.data?.state);
    if (raw == null) return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : Math.round(n);
  })();
  const seen = relativeTime(species.data?.last_changed, now);

  return (
    <Board
      collapsible
      storageKey="bird"
      title={
        <HStack width="100%" align="center" gap="1.5vmin">
          <SectionTitle icon={<PiBirdFill />}>BIRDS</SectionTitle>
          <Box flex="1" minW="0" />
          <Text
            fontSize="1.8vmin"
            color="var(--theme-fg-dim)"
            letterSpacing="0.06em"
            fontWeight="500"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            maxW="40vmin"
          >
            {name}
          </Text>
        </HStack>
      }
    >
      <HStack width="100%" justify="space-between" align="baseline" gap="2vmin">
        <VStack align="flex-start" gap="0.2vmin" flex="1" minW="0">
          <Text
            fontSize="3.8vmin"
            color="var(--theme-fg-dim)"
            fontWeight="300"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            maxW="100%"
          >
            {name}
          </Text>
          {scientificName && (
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              fontStyle="italic"
              letterSpacing="0.04em"
              overflow="hidden"
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              maxW="100%"
            >
              {scientificName}
            </Text>
          )}
        </VStack>
        <VStack align="flex-end" gap="0.2vmin" flexShrink={0}>
          {confidencePct != null && (
            <Text
              fontSize="3.4vmin"
              color="var(--theme-fg-dim)"
              fontWeight="300"
              lineHeight="1"
            >
              {confidencePct}%
            </Text>
          )}
          {seen && (
            <Text
              fontSize="2.2vmin"
              color="var(--theme-fg-faint)"
              letterSpacing="0.08em"
            >
              {seen}
            </Text>
          )}
        </VStack>
      </HStack>
    </Board>
  );
}
