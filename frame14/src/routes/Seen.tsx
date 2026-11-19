import { Text } from "@chakra-ui/react";
import { IoVideocamOutline } from "react-icons/io5";
import { useParams } from "react-router";
import { Board } from "../components/Board";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { SeenMomentCard } from "../components/SeenMomentCard";
import { EmptyState } from "../components/ui/empty-state";
import { useSeenMoment } from "../hooks/useSeen";
import { fmtClock, fmtWhen } from "../lib/format";

const MAX_W = { portrait: "100%", landscape: "56rem" };

/** "3:42 PM" today, "Yesterday at 3:42 PM" and so on before. */
function when(at: string): string {
  const date = new Date(at);
  const day = fmtWhen(date);
  const clock = fmtClock(date);
  return day === clock ? clock : `${day} at ${clock}`;
}

/**
 * /seen/:id (0.178.0): the page a notification that named a camera opens —
 * what the camera saw as it went out (seen.js). No nav entry: it is reached
 * from the notification alone.
 */
export function Seen() {
  const { id = "" } = useParams();
  const { data: moment, isPending, isError } = useSeenMoment(id);

  return (
    // As wide as a picture whose words still fit under it on a laptop's screen.
    <PageShell center maxW={MAX_W}>
      <PageHeader
        icon={<IoVideocamOutline />}
        title={moment?.title ?? "Seen"}
        actions={
          moment && (
            <Text textStyle="sm" color="fg.muted" data-seen-when>
              {when(moment.at)}
            </Text>
          )
        }
      />
      {moment ? (
        <SeenMomentCard moment={moment} />
      ) : (
        !isPending && (
          <Board>
            <EmptyState
              icon={<IoVideocamOutline />}
              title={isError ? "Couldn't load this" : "This moment is gone"}
              description={
                isError
                  ? "The add-on didn't answer. Try again in a moment."
                  : "Frame14 keeps the last 20 for a week."
              }
            />
          </Board>
        )
      )}
    </PageShell>
  );
}
