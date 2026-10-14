import { useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";
import { PiBirdFill } from "react-icons/pi";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { useEntity } from "../hooks/useEntity";
import { birdBaseId, birdEntityId } from "../lib/birdEntities";
import { StatusChip } from "./StatusChip";

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
    <StatusChip
      icon={<PiBirdFill />}
      grow
      label={`Last bird detection: ${name}`}
    >
      <Text textStyle="md" truncate minW="0">
        {name}
      </Text>
      {scientificName && (
        <Text
          textStyle="sm"
          color="fg.muted"
          fontStyle="italic"
          truncate
          minW="0"
        >
          {scientificName}
        </Text>
      )}
      {confidencePct != null && (
        <Text textStyle="sm" color="fg.muted" flexShrink={0} ms="auto">
          {confidencePct}%
        </Text>
      )}
      {seen && (
        <Text textStyle="sm" color="fg.muted" flexShrink={0}>
          {seen}
        </Text>
      )}
    </StatusChip>
  );
}
