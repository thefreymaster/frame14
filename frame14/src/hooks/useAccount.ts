import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { socket } from "../lib/socket";

/** One person on one kind of device (people.js). */
export interface Person {
  email: string;
  /** The kind of device, as its page said of itself (lib/deviceName). */
  device: string;
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
