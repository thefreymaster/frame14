import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { socket } from "../lib/socket";

/** One person on one kind of device (people.js). */
export interface Person {
  email: string;
  /** The kind of device, as its page said of itself (lib/deviceName). */
  device: string;
  /** What someone signed in called it (lib/deviceAlias); none, it goes by its kind. */
  alias?: string;
  /** A page of theirs is open on that device now. */
  online: boolean;
  /** When it arrived or, once gone, when it left (an ISO time). */
  lastSeen: string;
}

/** GET /api/account: who this device is and who is signed in. */
export interface Account {
  /** Whether people are named at all (`cloudflare_access_team`). */
  enabled: boolean;
  /** This device's person, when Cloudflare Access signed it in. */
  user: { email: string } | null;
  people: Person[];
}

async function fetchAccount(): Promise<Account> {
  const res = await fetch("/api/account");
  if (!res.ok) throw new Error(`Account fetch failed: ${res.status}`);
  return res.json() as Promise<Account>;
}

// The server sends the list again as someone comes or goes (index.js's
// "people"): the card follows without asking.
socket.on("people", (people: Person[]) => {
  queryClient.setQueryData<Account>(
    ["account"],
    (account) => account && { ...account, people },
  );
});

/**
 * Gives a row of the list its alias (PUT /api/account/alias, 0.173.0; ""
 * takes it away). The server keeps it and sends the list to every signed-in
 * device — this one's is replaced by the answer, without waiting for that.
 * Resolves, never rejects: a refusal comes back with the server's words.
 */
export async function saveDeviceAlias(
  person: Pick<Person, "email" | "device">,
  alias: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/account/alias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: person.email, device: person.device, alias }),
    });
    const body = (await res.json().catch(() => null)) as
      | (Account & { error?: string })
      | null;
    if (!res.ok || !body || !Array.isArray(body.people)) {
      return {
        ok: false,
        error: body?.error ?? `The server answered ${res.status}.`,
      };
    }
    queryClient.setQueryData<Account>(["account"], body);
    return { ok: true };
  } catch {
    return { ok: false, error: "The server couldn't be reached." };
  }
}

/**
 * Settings' Account card's facts (0.168.0): who Cloudflare Access says this
 * device is, and everyone signed in, kept live over the socket. Asked only
 * where people are named at all (`enabled`: lib/features' `account`), and
 * kept between launches (lib/persistedQueries), so the card of a device that
 * is signed in is there from the first paint.
 */
export function useAccount(enabled: boolean) {
  return useQuery<Account>({
    queryKey: ["account"],
    queryFn: fetchAccount,
    enabled,
    staleTime: 0,
  });
}
