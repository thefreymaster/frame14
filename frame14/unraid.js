// The Unraid servers (0.151.0): Home Assistant's Unraid integration, found
// in its registries rather than configured. A server brings dozens of
// containers with half a dozen entities each, and their entity ids follow no
// one pattern (those added once the device sat in an area carry the area's
// name in front: `switch.workshop_unserver_container_jellyfin` beside
// `switch.unserver_container_plex`), but the unique ids do:
// `<server uuid>_<key>`, the key `cpu_usage`, `ram_usage`, … for the server,
// `container_switch_<name>` and `vm_switch_<name>` for a container's and a
// VM's switch — read for its state and attributes (Docker's status and the
// template's icon, libvirt's state), never switched — and
// `container_<name>_cpu` / `container_<name>_memory_used` for what a
// container uses, sensors the integration leaves disabled until they're
// turned on in Home Assistant. ha-areas.js reads the registries (once
// primed, and after a registry event) and hands them here; the servers go
// to the pages as GET /api/entities' `unraid`, and the Unraid page
// subscribes to the ids.
//
// The page is read only (the user: "I only want read data"), and
// ha-socket.js's callableSwitch turns away a call to any of these switches.
// The array, parity and disk spin-down switches, the buttons and the update
// entities aren't handed over at all.

/** The server's sensors the page shows, by unique-id key. */
const SERVER_SENSORS = {
  cpu_usage: "cpu",
  cpu_temp: "cpuTemperature",
  cpu_power: "cpuPower",
  ram_usage: "memory",
  ram_used: "memoryUsed",
  docker_total_cpu: "dockerCpu",
  docker_total_memory_bytes: "dockerMemoryUsed",
  uptime: "upSince",
  unraid_version: "version",
};

const CONTAINER_SWITCH = "container_switch_";
const VM_SWITCH = "vm_switch_";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

/**
 * The Unraid servers in Home Assistant's device and entity registries, by
 * config entry, in name order: each its device's name, the sensor ids above
 * (null where the integration has none, or it is disabled), its containers
 * and its VMs (0.151.0), each in name order — one whose switch is disabled or
 * hidden in Home Assistant is left out, and a container's usage sensors are
 * there only while enabled.
 */
export function resolveUnraid(devices, entities) {
  const deviceName = new Map(
    devices.map((d) => [d.id, d.name_by_user || d.name || null]),
  );
  // config entry id -> { name, sensors: key -> id, switches: key -> id }
  const found = new Map();
  for (const e of entities) {
    if (e.platform !== "unraid" || e.disabled_by) continue;
    const uid = typeof e.unique_id === "string" ? e.unique_id : "";
    const cut = uid.indexOf("_");
    if (cut < 1) continue;
    const id = e.config_entry_id || uid.slice(0, cut);
    let server = found.get(id);
    if (!server) {
      server = { name: null, sensors: new Map(), switches: new Map() };
      found.set(id, server);
    }
    if (!server.name && e.device_id) server.name = deviceName.get(e.device_id) ?? null;
    const key = uid.slice(cut + 1);
    if (e.entity_id.startsWith("sensor.")) server.sensors.set(key, e.entity_id);
    else if (e.entity_id.startsWith("switch.") && !e.hidden_by)
      server.switches.set(key, e.entity_id);
  }

  const servers = [];
  for (const [id, { name, sensors, switches }] of found) {
    const containers = [];
    const vms = [];
    for (const [key, entityId] of switches) {
      if (key.startsWith(VM_SWITCH)) {
        vms.push({ name: key.slice(VM_SWITCH.length), switch: entityId });
        continue;
      }
      if (!key.startsWith(CONTAINER_SWITCH)) continue;
      const container = key.slice(CONTAINER_SWITCH.length);
      containers.push({
        name: container,
        switch: entityId,
        cpu: sensors.get(`container_${container}_cpu`) ?? null,
        memory: sensors.get(`container_${container}_memory_used`) ?? null,
      });
    }
    containers.sort((a, b) => collator.compare(a.name, b.name));
    vms.sort((a, b) => collator.compare(a.name, b.name));
    const server = { id, name: name ?? "Unraid" };
    for (const [key, field] of Object.entries(SERVER_SENSORS))
      server[field] = sensors.get(key) ?? null;
    server.containers = containers;
    server.vms = vms;
    if (!containers.length && !vms.length && !server.cpu && !server.memory)
      continue;
    servers.push(server);
  }
  return servers.sort((a, b) => collator.compare(a.name, b.name));
}
