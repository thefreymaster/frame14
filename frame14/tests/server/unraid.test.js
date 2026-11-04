import { describe, expect, it } from "vitest";
import { resolveUnraid } from "../../unraid.js";

// Home Assistant's registries as the Unraid integration fills them: unique
// ids `<server uuid>_<key>`, entity ids that don't follow one pattern.
const UUID = "42874c87-7278-4a8f-6d17-50ebf67ec6f3";
const entry = (entity_id, key, extra = {}) => ({
  entity_id,
  unique_id: `${UUID}_${key}`,
  platform: "unraid",
  config_entry_id: "entry_1",
  device_id: "dev_unserver",
  disabled_by: null,
  hidden_by: null,
  ...extra,
});

const DEVICES = [
  { id: "dev_unserver", name: "UnServer", name_by_user: null },
  { id: "dev_other", name: "Kitchen plug" },
];

const ENTITIES = [
  entry("sensor.unserver_cpu_usage", "cpu_usage"),
  entry("sensor.unserver_ram_usage", "ram_usage"),
  entry("sensor.unserver_ram_used", "ram_used"),
  entry("sensor.unserver_cpu_temperature", "cpu_temp"),
  entry("sensor.unserver_up_since", "uptime"),
  entry("sensor.unserver_swap_usage", "swap_usage", { disabled_by: "integration" }),
  entry("switch.unserver_array", "array"),
  entry("switch.unserver_vm_home_assistant", "vm_switch_Home Assistant"),
  entry("switch.workshop_unserver_vm_claude", "vm_switch_claude"),
  entry("switch.unserver_vm_old", "vm_switch_Old", { hidden_by: "user" }),
  entry("sensor.workshop_unserver_vm_claude_status", "vm_status_claude"),
  entry("button.unserver_force_stop_vm_home_assistant", "force_stop_vm_Home Assistant"),
  entry("switch.unserver_container_plex", "container_switch_Plex"),
  entry("switch.unserver_container_plex_autostart", "container_autostart_Plex"),
  entry("sensor.unserver_container_plex_cpu", "container_Plex_cpu"),
  entry("sensor.workshop_unserver_container_plex_memory_used", "container_Plex_memory_used"),
  entry("binary_sensor.unserver_container_plex_update", "container_Plex_update"),
  entry("update.unserver_container_plex_update", "container_Plex_update"),
  entry("button.unserver_restart_container_plex", "restart_container_Plex"),
  // An area-prefixed id, as newer entities get; its sensors disabled.
  entry("switch.workshop_unserver_container_jellyfin", "container_switch_Jellyfin"),
  entry("sensor.workshop_unserver_container_jellyfin_cpu", "container_Jellyfin_cpu", { disabled_by: "integration" }),
  entry("switch.unserver_container_adguard_home", "container_switch_AdGuard-Home"),
  entry("switch.unserver_container_binhex_filebrowser", "container_switch_binhex-filebrowser"),
  entry("switch.unserver_container_old", "container_switch_Old", { disabled_by: "user" }),
  entry("switch.unserver_container_ghost", "container_switch_Ghost", { hidden_by: "user" }),
  // Not the integration's.
  { entity_id: "switch.plug", unique_id: "abc_container_switch_Plug", platform: "tplink", device_id: "dev_other" },
];

describe("resolveUnraid", () => {
  it("finds the server by its config entry, named after its device, with its sensors by unique id", () => {
    const [server, ...more] = resolveUnraid(DEVICES, ENTITIES);
    expect(more).toEqual([]);
    expect(server).toMatchObject({
      id: "entry_1",
      name: "UnServer",
      cpu: "sensor.unserver_cpu_usage",
      memory: "sensor.unserver_ram_usage",
      memoryUsed: "sensor.unserver_ram_used",
      cpuTemperature: "sensor.unserver_cpu_temperature",
      upSince: "sensor.unserver_up_since",
      // Sensors the integration hasn't got here are null.
      cpuPower: null,
      dockerCpu: null,
      dockerMemoryUsed: null,
      version: null,
    });
  });

  it("lists the VMs by their switches in name order, a hidden one left out (0.151.0)", () => {
    const [server] = resolveUnraid(DEVICES, ENTITIES);
    expect(server.vms).toEqual([
      { name: "claude", switch: "switch.workshop_unserver_vm_claude" },
      { name: "Home Assistant", switch: "switch.unserver_vm_home_assistant" },
    ]);
  });

  it("lists the containers by their switches in name order, whatever the entity ids — never the array, VM or autostart switches", () => {
    const [server] = resolveUnraid(DEVICES, ENTITIES);
    expect(server.containers.map((c) => [c.name, c.switch])).toEqual([
      ["AdGuard-Home", "switch.unserver_container_adguard_home"],
      ["binhex-filebrowser", "switch.unserver_container_binhex_filebrowser"],
      ["Jellyfin", "switch.workshop_unserver_container_jellyfin"],
      ["Plex", "switch.unserver_container_plex"],
    ]);
  });

  it("leaves out a container whose switch is disabled or hidden in Home Assistant", () => {
    const names = resolveUnraid(DEVICES, ENTITIES)[0].containers.map((c) => c.name);
    expect(names).not.toContain("Old");
    expect(names).not.toContain("Ghost");
  });

  it("gives a container its CPU and memory sensors only while they're enabled", () => {
    const byName = Object.fromEntries(resolveUnraid(DEVICES, ENTITIES)[0].containers.map((c) => [c.name, c]));
    expect(byName.Plex).toMatchObject({
      cpu: "sensor.unserver_container_plex_cpu",
      memory: "sensor.workshop_unserver_container_plex_memory_used",
    });
    expect(byName.Jellyfin).toMatchObject({ cpu: null, memory: null });
  });

  it("keeps two servers apart, in name order, and names one whose device is gone Unraid", () => {
    const other = (id, key) => ({
      ...entry(id, key),
      unique_id: `aaaa-bbbb_${key}`,
      config_entry_id: "entry_2",
      device_id: "dev_gone",
    });
    const servers = resolveUnraid(
      [...DEVICES, { id: "dev_vault", name: "Vault", name_by_user: "Attic" }],
      [
        ...ENTITIES,
        other("sensor.attic_cpu_usage", "cpu_usage"),
        { ...entry("switch.attic_container_nas", "container_switch_NAS"), unique_id: "cccc_container_switch_NAS", config_entry_id: "entry_3", device_id: "dev_vault" },
      ],
    );
    expect(servers.map((s) => [s.id, s.name])).toEqual([
      ["entry_3", "Attic"],
      ["entry_2", "Unraid"],
      ["entry_1", "UnServer"],
    ]);
    expect(servers[1].cpu).toBe("sensor.attic_cpu_usage");
    expect(servers[0].containers.map((c) => c.name)).toEqual(["NAS"]);
  });

  it("finds nothing without the integration, and no server with neither containers nor CPU or memory", () => {
    expect(resolveUnraid(DEVICES, [ENTITIES.at(-1)])).toEqual([]);
    expect(resolveUnraid(DEVICES, [entry("sensor.unserver_up_since", "uptime")])).toEqual([]);
    // A unique id with no key is no entity of ours.
    expect(resolveUnraid(DEVICES, [{ ...entry("sensor.x", "cpu_usage"), unique_id: "nokey" }])).toEqual([]);
  });
});
