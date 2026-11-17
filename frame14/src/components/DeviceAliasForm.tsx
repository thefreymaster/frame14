import { HStack, IconButton, Input } from "@chakra-ui/react";
import { useState } from "react";
import { IoCheckmark, IoClose } from "react-icons/io5";
import { saveDeviceAlias, type Person } from "../hooks/useAccount";
import { DEVICE_ALIAS_MAX, tidyAlias } from "../lib/deviceAlias";
import { toaster } from "./ui/toaster";

/**
 * A signed-in device's alias being typed, in its row of Settings' Account
 * card (0.173.0): a field holding the alias it has, a tick that saves and a
 * cross that doesn't. Enter saves and Escape leaves, as the two buttons do.
 * Left empty, the alias is taken away and the row goes by its kind again —
 * the field's placeholder, so it says what empty will read as.
 *
 * Saving is the server's (saveDeviceAlias): the row shows the new alias
 * when it answers, and a refusal is a toast with the field left as typed.
 *
 * The tick is the form's submit button, so it and Enter save the one way.
 * On an iPhone a tap on it lands on the label lib/haptics lays over every
 * button; the form is submitted all the same (tried in Chromium and in
 * Playwright's WebKit as an iPhone; account.spec holds it).
 */
export function DeviceAliasForm({
  person,
  onDone,
}: {
  person: Person;
  /** The typing is over: saved, or left alone. */
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(person.alias ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const alias = tidyAlias(draft);
    if (alias === (person.alias ?? "")) {
      onDone();
      return;
    }
    setSaving(true);
    const result = await saveDeviceAlias(person, alias);
    if (result.ok) {
      onDone();
      return;
    }
    setSaving(false);
    toaster.create({
      type: "error",
      title: "The alias wasn't saved",
      description: result.error,
    });
  }

  return (
    <HStack
      as="form"
      gap="1"
      flex="1"
      minW="0"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      data-alias-form=""
    >
      <Input
        // `lg` is the first size whose type is a whole rem: under 16px an
        // iPhone zooms the page in on the field as it takes the focus.
        size="lg"
        flex="1"
        minW="0"
        me="1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        placeholder={person.device}
        aria-label={`Alias for ${person.email}'s ${person.device}`}
        maxLength={DEVICE_ALIAS_MAX}
        disabled={saving}
        autoFocus
        // A name, not prose: nothing to correct, and a capital to start.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
      />
      <IconButton
        type="submit"
        variant="subtle"
        size="xs"
        aria-label="Save alias"
        loading={saving}
      >
        <IoCheckmark />
      </IconButton>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Cancel"
        disabled={saving}
        onClick={onDone}
      >
        <IoClose />
      </IconButton>
    </HStack>
  );
}
