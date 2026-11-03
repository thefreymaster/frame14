import { describe, expect, it } from "vitest";
import type { HAState } from "../../src/hooks/useEntity";
import {
  containerIcon,
  containerStatus,
  cpuDetail,
  guestStatus,
  fmtPercent,
  fmtReading,
  fmtUptime,
  memoryDetail,
  sensorNumber,
} from "../../src/lib/unraid";

const st = <A extends object>(state: string, attributes = {} as A): HAState<A> => ({
  entity_id: "x.y",
  state,
  attributes,
  last_changed: "",
  last_updated: "",
});

describe("containerStatus", () => {
  it("reads the switch, with Docker's status for the rest", () => {
    expect(containerStatus(st("on", { status: "RUNNING" }))).toEqual({ label: "Running", palette: "green", running: true });
    expect(containerStatus(st("off", { status: "EXITED" }))).toEqual({ label: "Stopped", palette: "gray", running: false });
    expect(containerStatus(st("on", { status: "PAUSED" }))).toMatchObject({ label: "Paused", palette: "orange", running: true });
    expect(containerStatus(st("on", { status: "restarting" }))).toMatchObject({ label: "Restarting", running: true });
    // A switch that's on without a status is running; off is stopped, whatever it says.
    expect(containerStatus(st("on"))).toMatchObject({ label: "Running" });
    expect(containerStatus(st("off", { status: "RUNNING" }))).toMatchObject({ label: "Stopped" });
  });

  it("is unavailable without a state, or while Home Assistant has none", () => {
    for (const s of [undefined, st("unavailable"), st("unknown")])
      expect(containerStatus(s)).toEqual({ label: "Unavailable", palette: "gray", running: false });
  });
});

describe("guestStatus for a VM", () => {
  it("reads libvirt's state, not Docker's status", () => {
    expect(guestStatus("vm", st("on", { state: "RUNNING" }))).toMatchObject({ label: "Running", running: true });
    expect(guestStatus("vm", st("on", { state: "PAUSED" }))).toMatchObject({ label: "Paused", palette: "orange" });
    expect(guestStatus("vm", st("on", { state: "PMSUSPENDED" }))).toMatchObject({ label: "Suspended", running: true });
    expect(guestStatus("vm", st("off", { state: "SHUTOFF" }))).toMatchObject({ label: "Stopped", running: false });
    // A container's field means nothing on a VM.
    expect(guestStatus("vm", st("on", { status: "PAUSED" }))).toMatchObject({ label: "Running" });
  });
});

describe("containerIcon", () => {
  it("is the template's icon when it's an https URL", () => {
    expect(containerIcon(st("on", { icon_url: "https://example.com/plex.png" }))).toBe("https://example.com/plex.png");
    expect(containerIcon(st("on", { icon_url: "http://10.0.0.2/plex.png" }))).toBeNull();
    expect(containerIcon(st("on", { icon_url: "javascript:alert(1)" }))).toBeNull();
    expect(containerIcon(st("on"))).toBeNull();
    expect(containerIcon(undefined)).toBeNull();
  });
});

describe("the readings", () => {
  it("reads a sensor's number, or none", () => {
    expect(sensorNumber(st("13.7"))).toBe(13.7);
    expect(sensorNumber(st("unavailable"))).toBeNull();
    expect(sensorNumber(undefined)).toBeNull();
  });

  it("writes a percentage, and a reading with its unit, to a sensible precision", () => {
    expect(fmtPercent(st("6.64"))).toBe("6.6%");
    expect(fmtPercent(st("100"))).toBe("100%");
    expect(fmtPercent(st("unknown"))).toBe("—");
    expect(fmtReading(st("8.56265330687165", { unit_of_measurement: "GiB" }))).toBe("8.6 GiB");
    expect(fmtReading(st("512.3", { unit_of_measurement: "MB" }))).toBe("512 MB");
    expect(fmtReading(st("75.2", { unit_of_measurement: "°F" }))).toBe("75.2°F");
    expect(fmtReading(st("16", { unit_of_measurement: "W" }))).toBe("16 W");
    expect(fmtReading(st("0.25", { unit_of_measurement: "GiB" }))).toBe("0.25 GiB");
    expect(fmtReading(undefined)).toBe("—");
  });

  it("says how long the server has been up", () => {
    const now = new Date("2026-11-03T20:00:00Z");
    expect(fmtUptime("2026-11-02T00:39:37+00:00", now)).toBe("1d 19h");
    expect(fmtUptime("2026-11-03T14:48:00Z", now)).toBe("5h 12m");
    expect(fmtUptime("2026-11-03T19:56:00Z", now)).toBe("4m");
    expect(fmtUptime("unknown", now)).toBe("—");
    expect(fmtUptime(undefined, now)).toBe("—");
    expect(fmtUptime("2026-11-04T00:00:00Z", now)).toBe("—");
  });

  it("gives the CPU's cores and threads and the memory's available of total", () => {
    expect(cpuDetail(st("13.7", { cpu_cores: 10, cpu_threads: 16 }))).toBe("10 cores · 16 threads");
    expect(cpuDetail(st("13.7", { cpu_cores: 1 }))).toBe("1 core");
    expect(cpuDetail(st("13.7"))).toBeNull();
    expect(memoryDetail(st("82.2", { total: "31.1 GB", available: "5.5 GB" }))).toBe("5.5 GB available of 31.1 GB");
    expect(memoryDetail(st("82.2", { total: "31.1 GB" }))).toBe("31.1 GB in all");
    expect(memoryDetail(st("82.2"))).toBeNull();
  });
});
