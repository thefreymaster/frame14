import { Stack, Text } from "@chakra-ui/react";
import { IoPersonCircleOutline } from "react-icons/io5";
import { useAccount } from "../hooks/useAccount";
import { useFeatures } from "../hooks/useFeatures";
import { deviceName } from "../lib/deviceName";
import { AccountPersonTile } from "./AccountPersonTile";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * /control's Account card (0.168.0, the user: "so I can tell who is logged
 * in"): who Cloudflare Access signed this device in as, and everyone signed
 * in — a row per person and kind of device (AccountPersonTile), those with
 * a page open now first, kept live over the socket (useAccount).
 *
 * Access does the signing in; Frame14 only reads what it says, and asks for
 * nothing ("the name from access"). So there is no card where Access isn't
 * in use (the user: "It should only show access if the user is using access
 * … If they aren't it should still work"): none on an install with no
 * `cloudflare_access_team` (lib/features' `account`), and none on a device
 * Access didn't sign in — one on the home network, the frame — which works
 * as it always did.
 */
export function AccountBoard() {
  const features = useFeatures();
  const { data } = useAccount(features.account);
  const me = data?.enabled ? data.user?.email : undefined;
  if (!features.account || !me) return null;
  const mine = deviceName();

  return (
    <Board
      title={<SectionTitle icon={<IoPersonCircleOutline />}>Account</SectionTitle>}
    >
      <Stack gap="4">
        <Stack gap="1">
          <Text wordBreak="break-word" data-account-user={me}>
            Signed in as{" "}
            <Text as="span" fontWeight="medium">
              {me}
            </Text>
          </Text>
          <Text textStyle="sm" color="fg.muted">
            Cloudflare Access signed this device in.
          </Text>
        </Stack>
        {data && data.people.length > 0 && (
          <Stack gap="2">
            <Text textStyle="sm" fontWeight="medium" id="account-people">
              People signed in
            </Text>
            <Stack gap="2" role="list" aria-labelledby="account-people">
              {data.people.map((person) => (
                <AccountPersonTile
                  key={`${person.email}|${person.device}`}
                  person={person}
                  self={person.email === me && person.device === mine}
                />
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Board>
  );
}
