import { zodResolver } from "@hookform/resolvers/zod";
import { createFormControl } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { addPlayerSchema } from "@/lib/validation/schemas";
import type { AddPlayerInput } from "@/lib/validation/schemas";

import { clearFieldAndRefocus } from "./clear-field";

/* A regression test for the Quick Play add-player field, which stopped
   accepting a second name once the form cleared itself with `reset()`.

   `createFormControl` is react-hook-form's hook-free core — the same object
   `useForm` returns minus `formState` — so the whole submit/clear cycle runs in
   the node environment vitest is configured for, with no DOM and no new
   dependency. The harness below registers the field exactly once and never
   again, which is precisely what the React Compiler does to `AddPlayerForm`:
   `register` is referentially stable, so `register("name")` and the `ref`
   callback it returns are memoised on the first render forever.

   What this does NOT cover: the component actually rendering, the Enter key,
   real DOM focus, and the compiler's output itself. Those are browser checks. */

type SubmitResult = { added: string } | { error: string | undefined };

function makeHarness() {
  const form = createFormControl<AddPlayerInput>({
    resolver: zodResolver(addPlayerSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { name: "" },
  });

  let focusCount = 0;
  const input = {
    name: "name",
    type: "text",
    value: "",
    focus: () => {
      focusCount += 1;
    },
  };

  // Once, and never again — see the note above. A component that re-registered
  // on every render would hide the bug this file exists to catch.
  const props = form.register("name");
  props.ref(input);

  const type = async (text: string) => {
    input.value = text;
    await props.onChange({ target: input, type: "change" });
  };

  const submit = async (): Promise<SubmitResult> => {
    let result: SubmitResult | null = null;
    await form.handleSubmit(
      (values) => {
        result = { added: values.name };
      },
      (errors) => {
        result = { error: errors.name?.message };
      },
    )();
    if (result === null) throw new Error("neither submit callback ran");
    return result;
  };

  // `setFocus` defers the actual focus() through setTimeout.
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  return {
    form,
    input,
    type,
    submit,
    flush,
    focusCount: () => focusCount,
    forgetFocus: () => {
      focusCount = 0;
    },
  };
}

describe("clearFieldAndRefocus", () => {
  it("takes five names in a row through a field that is only registered once", async () => {
    const h = makeHarness();

    for (const name of ["Raffy", "Patchi", "Migs", "Jordan Lee", "Alex Chen"]) {
      await h.type(name);
      expect(await h.submit()).toEqual({ added: name });

      clearFieldAndRefocus<AddPlayerInput>(h.form, "name");
      expect(h.input.value).toBe("");
    }
  });

  it("puts the caret back in the field it cleared", async () => {
    const h = makeHarness();

    await h.type("Raffy");
    await h.submit();
    h.forgetFocus();

    clearFieldAndRefocus<AddPlayerInput>(h.form, "name");
    await h.flush();
    expect(h.focusCount()).toBe(1);
  });

  it("does not complain at the first character of the next name", async () => {
    const h = makeHarness();

    await h.type("Raffy");
    await h.submit();
    clearFieldAndRefocus<AddPlayerInput>(h.form, "name");

    await h.type("P");
    expect(h.form.getFieldState("name").error).toBeUndefined();
  });

  it("still rejects an empty submit after a successful add", async () => {
    const h = makeHarness();

    await h.type("Raffy");
    await h.submit();
    clearFieldAndRefocus<AddPlayerInput>(h.form, "name");

    expect(await h.submit()).toEqual({ error: "Enter a player name." });
  });

  it("still rejects an over-long name after a successful add", async () => {
    const h = makeHarness();

    await h.type("Raffy");
    await h.submit();
    clearFieldAndRefocus<AddPlayerInput>(h.form, "name");

    await h.type("x".repeat(41));
    expect(await h.submit()).toEqual({
      error: "Keep names under 40 characters.",
    });
  });
});
