import { Badge, Flex, Grid, SimpleGrid, Skeleton, Stack, Stat } from "@chakra-ui/react";
import { LuCpu, LuMemoryStick, LuServer } from "react-icons/lu";
import { useEntitiesAcked, useEntity } from "../hooks/useEntity";
import { useNow } from "../hooks/useNow";
import {
  cpuDetail,
  fmtPercent,
  fmtReading,
  fmtUptime,
  memoryDetail,
  sensorNumber,
  type UnraidServer,
} from "../lib/unraid";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { UsageMeter } from "./UsageMeter";

/**
 * The meters side by side from this width of the card's body, else stacked:
 * by the card's width, not the screen's (0.152.0), since on a desktop the
 * card is a third of the page.
 */
const METERS_SIDE_BY_SIDE = "@container (min-width: 36rem)";

/**
 * One Unraid server's health (0.151.0): its name and Unraid version in the
 * header, the CPU and the memory as UsageMeters side by side (stacked in a
 * narrow card: a phone's, a desktop's left column) — the CPU's cores and
 * threads, the memory's available of total under them — then the CPU's
 * temperature and power, what the containers use between them, and how
 * long it has been up. A figure the integration hasn't got reads "—"; one
 * whose sensor is disabled is left out.
 */
export function UnraidServerCard({ server }: { server: UnraidServer }) {
  const cpu = useEntity(server.cpu ?? "").data;
  const memory = useEntity(server.memory ?? "").data;
  const memoryUsed = useEntity(server.memoryUsed ?? "").data;
  const temperature = useEntity(server.cpuTemperature ?? "").data;
  const power = useEntity(server.cpuPower ?? "").data;
  const dockerCpu = useEntity(server.dockerCpu ?? "").data;
  const dockerMemory = useEntity(server.dockerMemoryUsed ?? "").data;
  const upSince = useEntity(server.upSince ?? "").data;
  const version = useEntity(server.version ?? "").data;
  const now = useNow(60_000);
  const loading = !useEntitiesAcked(
    [server.cpu, server.memory].filter((id): id is string => !!id),
  );

  const stats = [
    server.cpuTemperature && {
      label: "CPU temperature",
      value: fmtReading(temperature),
    },
    server.cpuPower && { label: "CPU power", value: fmtReading(power) },
    server.dockerCpu && { label: "Containers' CPU", value: fmtPercent(dockerCpu) },
    server.dockerMemoryUsed && {
      label: "Containers' memory",
      value: fmtReading(dockerMemory),
    },
    server.upSince && {
      label: "Up for",
      value: fmtUptime(upSince?.state, new Date(now)),
    },
  ].filter((s): s is { label: string; value: string } => !!s);

  const versionText =
    version && version.state !== "unavailable" && version.state !== "unknown"
      ? `Unraid ${version.state}`
      : null;

  return (
    <Board
      title={
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<LuServer />}>{server.name}</SectionTitle>
          {versionText && (
            <Badge colorPalette="gray" ms="auto">
              {versionText}
            </Badge>
          )}
        </Flex>
      }
    >
      <Stack gap="6" css={{ containerType: "inline-size" }}>
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: "minmax(0, 1fr)",
            [METERS_SIDE_BY_SIDE]: {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {server.cpu && (
            <UsageMeter
              label="CPU"
              icon={<LuCpu />}
              value={sensorNumber(cpu)}
              detail={cpuDetail(cpu)}
              loading={loading}
            />
          )}
          {server.memory && (
            <UsageMeter
              label="Memory"
              icon={<LuMemoryStick />}
              value={sensorNumber(memory)}
              detail={
                memoryDetail(memory) ??
                (memoryUsed ? `${fmtReading(memoryUsed)} used` : null)
              }
              loading={loading}
            />
          )}
        </Grid>
        {stats.length > 0 && (
          <SimpleGrid minChildWidth="9rem" gap="4">
            {stats.map((s) => (
              <Stat.Root key={s.label} size="sm">
                <Stat.Label>{s.label}</Stat.Label>
                {loading ? (
                  <Skeleton height="6" width="4rem" />
                ) : (
                  <Stat.ValueText>{s.value}</Stat.ValueText>
                )}
              </Stat.Root>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Board>
  );
}
