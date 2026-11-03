import { Fragment } from "react";
import { LuMonitor, LuServer } from "react-icons/lu";
import { TbBrandDocker } from "react-icons/tb";
import { Board } from "../components/Board";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { UnraidGuestsCard } from "../components/UnraidGuestsCard";
import { UnraidServerCard } from "../components/UnraidServerCard";
import { EmptyState } from "../components/ui/empty-state";
import { useUnraidServers } from "../hooks/useUnraid";

/**
 * The Unraid servers (0.151.0), from Home Assistant's Unraid integration:
 * per server its health (UnraidServerCard: CPU, memory, temperature, …) over
 * its containers and then its VMs, each a tile with its status
 * (UnraidGuestsCard). Read only: nothing here starts, stops or updates
 * anything (the user: "I only want read data"), and the server won't pass a
 * call to the integration's switches on (ha-socket.js's callableSwitch). In
 * the nav while the integration has a server; routed regardless, with an
 * EmptyState without one.
 */
export function Unraid() {
  const { servers, isPending } = useUnraidServers();
  // Whose cards, when there is more than one server.
  const whose = (name: string, what: string) =>
    servers.length > 1 ? `${name} ${what}` : what;

  return (
    <PageShell>
      <PageHeader icon={<LuServer />} title="Unraid" />
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
          <Fragment key={server.id}>
            <UnraidServerCard server={server} />
            {server.containers.length > 0 && (
              <UnraidGuestsCard
                kind="container"
                guests={server.containers}
                title={whose(server.name, "Containers")}
                icon={<TbBrandDocker />}
              />
            )}
            {(server.vms?.length ?? 0) > 0 && (
              <UnraidGuestsCard
                kind="vm"
                guests={server.vms ?? []}
                title={whose(server.name, "VMs")}
                icon={<LuMonitor />}
              />
            )}
          </Fragment>
        ))
      )}
    </PageShell>
  );
}
