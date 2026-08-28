"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { accountInitials, accountName } from "@/lib/auth/viewer";

import styles from "./account-menu.module.css";

/**
 * The signed-in account cluster: an initials avatar that opens a small menu.
 *
 * `admin` rather than `isAdmin`, so the prop doesn't shadow the predicate of
 * that name at the call site.
 */
export function AccountMenu({
  email,
  admin,
  onSignOut,
}: {
  email: string | null;
  admin: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  /* Bumped by every outside press that closes the menu, so the effect below
     runs once per press. A counter rather than a boolean: two presses in a row
     have to schedule two checks, and a boolean that is already true wouldn't. */
  const [outsidePresses, setOutsidePresses] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // True only while a press that started inside the wrapper is still down.
  const pressInsideRef = useRef(false);
  // Suffixed rather than used raw, so the id stays unique if the header is ever
  // rendered twice on a page.
  const baseId = useId();
  const menuId = `${baseId}-menu`;

  /* One item today. It is still a list because the focus handling below is
     index-based, so a second row costs an entry here and nothing else. */
  const items = [{ label: "Sign out", icon: <SignOutIcon />, run: onSignOut }];

  // The roving tabindex's other half: whichever row is active gets focus, on
  // open and on every arrow key.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // Closing on an outside press rather than on the click that follows it, so
  // the menu is gone before the thing underneath reacts.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const inside = wrapperRef.current?.contains(event.target as Node) ?? false;
      // Read by `focusout` below, which cannot tell on its own whether the blur
      // it is seeing came from a press inside this menu.
      pressInsideRef.current = inside;
      if (inside) return;
      setOpen(false);
      setOutsidePresses((count) => count + 1);
    }
    /* Both endings, not just `pointerup`: a touch gesture that starts inside the
       panel and turns into a scroll ends in `pointercancel` and nothing else. */
    function onPressEnd() {
      pressInsideRef.current = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPressEnd);
    document.addEventListener("pointercancel", onPressEnd);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPressEnd);
      document.removeEventListener("pointercancel", onPressEnd);
      /* The menu can close while a press is still down — pressing the trigger
         to close it does exactly that — and the press's ending would then land
         on listeners that are already gone. A flag stranded `true` would tell
         the next open's `focusout` to sit out a genuine focus loss, so the
         press is over as far as this component is concerned. */
      pressInsideRef.current = false;
    };
  }, [open]);

  /* An outside press moves focus itself when it lands on something focusable.
     When it lands on a paragraph it doesn't: focus falls to `<body>` and a
     keyboard user's Tab order restarts at the top of the document, so put it
     back on the trigger they opened the menu from. Deferred by a frame because
     the focus change is mousedown's default action, which hasn't run yet when
     `pointerdown` closes the menu; `preventScroll` keeps the restore from
     yanking the page back up to the header. */
  useEffect(() => {
    if (outsidePresses === 0) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [outsidePresses]);

  /* Escape has to work from outside the wrapper too. A press on non-focusable
     panel content — the drag across the email address that `focusout` below is
     careful not to close on — leaves focus on `<body>`, and the wrapper's
     `onKeyDown` never sees a key again. Escape only: `Enter` and `Space` stay
     with the trigger's synthesized click, which is what this listener would
     double-fire against if it took them. `globalThis.` because this module
     imports React's `KeyboardEvent` type under that name. */
  useEffect(() => {
    if (!open) return;
    function onDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      // The wrapper's handler already dealt with it, focus being inside.
      if (event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => document.removeEventListener("keydown", onDocumentKeyDown);
  }, [open]);

  // Tab is never intercepted, so this is what closes the menu when focus walks
  // out of it — by keyboard, or by a screen reader moving its own cursor.
  useEffect(() => {
    if (!open) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function onFocusOut(event: FocusEvent) {
      const next = event.relatedTarget as Node | null;
      /* A null `relatedTarget` does not mean focus left the wrapper. A press on
         non-focusable content *inside* the panel — dragging across the email
         address to copy it, or landing on the padding, the divider or the Admin
         tag — blurs the focused row to `<body>` and reports exactly the same
         thing. Closing here would undo what the press handler above deliberately
         left open, so the press wins; a real walk-out (Tab, a screen reader
         cursor) carries a `relatedTarget`, and an outside press is already the
         other listener's job. */
      if (!next) {
        if (!pressInsideRef.current) setOpen(false);
        return;
      }
      if (!wrapperRef.current?.contains(next)) setOpen(false);
    }
    wrapper.addEventListener("focusout", onFocusOut);
    return () => wrapper.removeEventListener("focusout", onFocusOut);
  }, [open]);

  function activate(index: number) {
    setOpen(false);
    items[index].run();
  }

  /* Arrows, Home/End and Escape only. Enter and Space are left entirely to the
     browser's synthesized click: handling them here as well would open the menu
     on keydown and close it again on the click, from one key press. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open) {
        setActiveIndex((index) => (index + 1) % items.length);
      } else {
        setActiveIndex(0);
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open) {
        setActiveIndex((index) => (index - 1 + items.length) % items.length);
      } else {
        setActiveIndex(items.length - 1);
        setOpen(true);
      }
      return;
    }
    if (!open) return;
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    }
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper} onKeyDown={onKeyDown}>
      <Button
        ref={triggerRef}
        variant="icon"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        /* Two letters don't describe anything on their own, so the accessible
           name says whose account this is. */
        aria-label={email ? `Account menu for ${email}` : "Account menu"}
        onClick={() => {
          setActiveIndex(0);
          setOpen((wasOpen) => !wasOpen);
        }}
      >
        {accountInitials(email)}
      </Button>
      {open ? (
        <div className={styles.panel}>
          {/* Outside `role="menu"` on purpose: a menu's children have to be
              menuitems, and none of this is one. */}
          <div className={styles.identity}>
            <span className={styles.name}>{accountName(email)}</span>
            {email ? <span className={styles.email}>{email}</span> : null}
            {admin ? (
              <span style={{ marginTop: "2px" }}>
                <Tag tone="accent">Admin</Tag>
              </span>
            ) : null}
          </div>
          <div className={styles.divider} />
          <div id={menuId} role="menu" aria-label="Account">
            {items.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                className={styles.item}
                onClick={() => activate(index)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A door with an arrow leaving it. Decorative — the row's label says it. */
function SignOutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M15 17l5-5-5-5 M20 12H9 M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
