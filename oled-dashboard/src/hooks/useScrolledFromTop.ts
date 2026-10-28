import { useCallback, useSyncExternalStore, type RefObject } from "react";

/**
 * Whether the scroll container in `ref` has scrolled away from its top, so
 * its content runs under whatever is fixed over it (the header's hairline
 * edge). Read from the element itself (useSyncExternalStore over its scroll
 * events), so it is right however the position got there; it is read again
 * whenever `resetKey` changes, because a route change swaps the content and
 * a shorter page clamps the scroll back to the top. Negative offsets (iOS's
 * rubber band) count as the top. The window's scroll counts too (since
 * 0.117.1): in Safari on an iPhone the document scrolls, not the element.
 */
export function useScrolledFromTop(
  ref: RefObject<HTMLElement | null>,
  resetKey?: unknown,
): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const el = ref.current;
      window.addEventListener("scroll", onChange, { passive: true });
      el?.addEventListener("scroll", onChange, { passive: true });
      return () => {
        window.removeEventListener("scroll", onChange);
        el?.removeEventListener("scroll", onChange);
      };
    },
    // A new key resubscribes, and React reads the snapshot again with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref, resetKey],
  );
  const getSnapshot = useCallback(
    () => (ref.current?.scrollTop ?? 0) > 0 || window.scrollY > 0,
    [ref],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
