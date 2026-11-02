import { useCallback, useSyncExternalStore } from "react";
import {
  cancelVoiceTurn,
  getVoiceSnapshot,
  startVoiceTurn,
  subscribeVoice,
  type VoiceSnapshot,
} from "../lib/voiceAssist";

export function useVoiceAssist(): VoiceSnapshot & {
  start: () => void;
  cancel: () => void;
} {
  const snapshot = useSyncExternalStore(subscribeVoice, getVoiceSnapshot, getVoiceSnapshot);
  const start = useCallback(() => void startVoiceTurn(), []);
  const cancel = useCallback(() => cancelVoiceTurn(), []);
  return { ...snapshot, start, cancel };
}
