import { LuServer } from "react-icons/lu";
import { Board } from "../components/Board";
import { PageShell } from "../components/PageShell";
import { UnraidServerSection } from "../components/UnraidServerSection";
import { EmptyState } from "../components/ui/empty-state";
import { useUnraidServers } from "../hooks/useUnraid";

/**
 * The Unraid servers (0.151.0), from Home Assistant's Unraid integration:
 * per server its health, its VMs and its containers, each a tile with its
 * status (UnraidServerSection; on a desktop the health and the VMs a column
 * beside the containers, 0.152.0). No page header (0.152.0, the user: "it
 * gives no value"): the server's card names it. Read only: nothing here
 * starts, stops or updates anything (the user: "I only want read data"), and
 * the server won't pass a call to the integration's switches on
 * (ha-socket.js's callableSwitch). In the nav while the integration has a
 * server; routed regardless, with an EmptyState without one.
 */
export function Unraid() {
  const { servers, isPending } = useUnraidServers();

  return (
    <PageShell>
      {!isPending && servers.length === 0 ? (
        <Board>
          <EmptyState
            icon={<LuServer />}
            title="No Unraid server"
            description="Add the Unraid integration to Home Assistant, and its server shows here."
          />
        </Board>
      ) : (
        servers.map((server) => (
          <UnraidServerSection
            key={server.id}
            server={server}
            named={servers.length > 1}
          />
        ))
      )}
    </PageShell>
  );
}
