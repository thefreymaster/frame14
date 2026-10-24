import { SimpleGrid, Stat } from "@chakra-ui/react";
import type { PrinterModel, PrinterTemp } from "../hooks/usePrinter";
import { heaterOn } from "../lib/printerStatus";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

function fmtTemp(t: number | null): string {
  return t == null ? "—" : `${Math.round(t)}°`;
}

function TempStat({ label, temp }: { label: string; temp: PrinterTemp }) {
  const target =
    temp.target == null
      ? null
      : heaterOn(temp.target, temp.unit)
        ? `target ${fmtTemp(temp.target)}`
        : "off";
  return (
    <Stat.Root>
      <Stat.Label>{label}</Stat.Label>
      <Stat.ValueText>{fmtTemp(temp.value)}</Stat.ValueText>
      {target && <Stat.HelpText>{target}</Stat.HelpText>}
    </Stat.Root>
  );
}

/**
 * The printer's temperatures: nozzle and bed with their targets ("off" when
 * the heater is), and the chamber where the printer has a sensor for it.
 */
export function PrinterTempsCard({ printer }: { printer: PrinterModel }) {
  return (
    <Board title={<SectionTitle>Temperatures</SectionTitle>}>
      <SimpleGrid columns={printer.chamber ? 3 : 2} gap="4">
        <TempStat label="Nozzle" temp={printer.nozzle} />
        <TempStat label="Bed" temp={printer.bed} />
        {printer.chamber && <TempStat label="Chamber" temp={printer.chamber} />}
      </SimpleGrid>
    </Board>
  );
}
