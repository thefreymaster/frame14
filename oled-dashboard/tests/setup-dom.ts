// The client project's first setup file (vitest.config.ts), run before
// tests/setup.ts and so before anything imports React: React decides its
// event names as it loads, and the fixes here have to be in place by then.

// jsdom has no AnimationEvent. Without one React listens for the
// WebKit-prefixed animation events, so a `fireEvent.animationEnd` would
// never reach an `onAnimationEnd` (the witch's flight ends on one).
const w = globalThis as { AnimationEvent?: unknown };
if (typeof w.AnimationEvent === "undefined") {
  class AnimationEventStub extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;
    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init);
      this.animationName = init.animationName ?? "";
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? "";
    }
  }
  w.AnimationEvent = AnimationEventStub;
}

export {};
