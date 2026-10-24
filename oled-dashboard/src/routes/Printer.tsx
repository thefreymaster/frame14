import { Badge, Flex, Grid } from "@chakra-ui/react";
import { Board } from "../components/Board";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { PrinterCameraCard } from "../components/PrinterCameraCard";
import { PrinterJobCard } from "../components/PrinterJobCard";
import { PrinterTempsCard } from "../components/PrinterTempsCard";
import { EmptyState } from "../components/ui/empty-state";
import { usePrinter } from "../hooks/usePrinter";
import { Printer3dOutlineIcon } from "../lib/printerIcons";
import { printerStatus } from "../lib/printerStatus";

/**
 * The 3D printer: its status in the header, the camera, the job and the
 * temperatures. Stacked in portrait; in landscape the camera takes the left
 * and the job and temperatures stack beside it.
 */
export function Printer() {
  const printer = usePrinter();
  const { label, palette } = printerStatus(printer.status);

  return (
    <PageShell>
      <PageHeader
        icon={<Printer3dOutlineIcon />}
        title="3D printer"
        actions={
          printer.configured &&
          !printer.loading && (
            <>
              {printer.hms && <Badge colorPalette="orange">HMS alert</Badge>}
              <Badge colorPalette={palette}>{label}</Badge>
            </>
          )
        }
      />

      {!printer.configured ? (
        <Board>
          <EmptyState
            icon={<Printer3dOutlineIcon />}
            title="No printer configured"
            description="Set printer_status_entity in the add-on's options."
          />
        </Board>
      ) : (
        <Grid
          templateColumns={{
            base: "minmax(0, 1fr)",
            _landscape: printer.hasCamera
              ? "minmax(0, 3fr) minmax(0, 2fr)"
              : "minmax(0, 1fr)",
          }}
          gap="gutter"
          alignItems="start"
        >
          {printer.hasCamera && <PrinterCameraCard />}
          <Flex direction="column" gap="gutter" minW="0">
            <PrinterJobCard printer={printer} />
            <PrinterTempsCard printer={printer} />
          </Flex>
        </Grid>
      )}
    </PageShell>
  );
}
