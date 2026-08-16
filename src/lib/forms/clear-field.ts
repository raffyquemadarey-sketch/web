import type {
  FieldPath,
  FieldValues,
  UseFormResetField,
  UseFormSetFocus,
} from "react-hook-form";

/**
 * Empty one field and put the caret back in it, for forms that are submitted
 * over and over (Quick Play types a whole roster in this way).
 *
 * This is deliberately `resetField` and not `reset`:
 *
 * - `reset()` sets react-hook-form's internal `_fields = {}`, and relies on the
 *   next render calling `register(name)` again to repopulate it. Under
 *   `reactCompiler: true` that never happens — `register` is referentially
 *   stable for the life of the component, so the compiler memoises
 *   `register("name")` and its `ref` callback on the first render and never
 *   re-runs either. The field stays unregistered, RHF stops seeing typed input,
 *   and every later submit fails validation on an apparently empty value.
 * - `reset()` also breaks `setFocus`, compiler or not: `setFocus` looks the
 *   field up in the same `_fields` map that `reset()` just emptied, and returns
 *   silently when it is missing.
 *
 * `resetField` touches neither `_fields` nor the mounted-names set. It clears
 * the value through `setValue`, which writes both the form state and the live
 * DOM input, so the registry — and therefore `setFocus` — keeps working.
 *
 * Caller note: `resetField` does not clear `isSubmitted`, so pair it with
 * `reValidateMode: "onBlur"` unless per-keystroke revalidation is wanted.
 */
export function clearFieldAndRefocus<TFieldValues extends FieldValues>(
  form: {
    resetField: UseFormResetField<TFieldValues>;
    setFocus: UseFormSetFocus<TFieldValues>;
  },
  name: FieldPath<TFieldValues>,
): void {
  form.resetField(name);
  form.setFocus(name);
}
