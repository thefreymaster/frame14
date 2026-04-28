import { HStack, Box } from "@chakra-ui/react";
import { TbWashMachine, TbWashTumbleDry, TbBowlSpoon } from "react-icons/tb";
import type { IconType } from "react-icons";
import { useEntities } from "../hooks/useEntity";

const APPLIANCES: { id: string; Icon: IconType; label: string }[] = [
  {
    id: "binary_sensor.cloths_washer_clothes_washer_running",
    Icon: TbWashMachine,
    label: "washer",
  },
  {
    id: "binary_sensor.drier_dryer_running",
    Icon: TbWashTumbleDry,
    label: "dryer",
  },
  {
    id: "binary_sensor.dishwasher_running",
    Icon: TbBowlSpoon,
    label: "dishwasher",
  },
];

export function ApplianceIndicators() {
  const queries = useEntities(APPLIANCES.map((a) => a.id));
  const running = APPLIANCES.filter((_, i) => queries[i].data?.state === "on");
  if (running.length === 0) return null;

  return (
    <HStack gap="6px" align="center">
      {running.map(({ id, Icon, label }) => (
        <Box
          key={id}
          fontSize="10px"
          color="#22c55e"
          lineHeight="1"
          aria-label={`${label} running`}
        >
          <Icon />
        </Box>
      ))}
    </HStack>
  );
}
