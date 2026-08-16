import { InitialsAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { RosterEntry } from "@/lib/data/types";
import { skillLabel } from "@/lib/tournament/labels";

/** Every prop but `roster` is optional and defaults to the admin page's wording
 *  and behaviour; Quick Play, whose roster is hand-typed and has no skill
 *  levels, overrides them. */
export function RosterList({
  roster,
  title = "Players joined",
  emptyMessage = "No one has registered yet.",
  showSkill = true,
  onRemove,
}: {
  roster: RosterEntry[];
  title?: string;
  emptyMessage?: string;
  showSkill?: boolean;
  onRemove?: (name: string) => void;
}) {
  return (
    <div style={{ marginBottom: "30px" }}>
      <h3 style={{ fontSize: "18px", margin: "0 0 12px" }}>
        {title} ({roster.length})
      </h3>
      {roster.length === 0 ? (
        <p style={{ fontSize: "13.5px", opacity: 0.6, margin: 0 }}>
          {emptyMessage}
        </p>
      ) : (
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: "12px",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {roster.map((player) => (
            <li
              key={player.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "var(--color-surface)",
                borderRadius: "999px",
                boxShadow: "var(--shadow-sm)",
                padding: "7px 16px 7px 7px",
              }}
            >
              <InitialsAvatar name={player.name} size={38} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {player.name}
                </div>
                {showSkill ? (
                  <div
                    style={{ fontSize: "11.5px", opacity: 0.6, whiteSpace: "nowrap" }}
                  >
                    {skillLabel(player.skill)}
                  </div>
                ) : null}
              </div>
              {onRemove ? (
                <Button
                  variant="icon"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => onRemove(player.name)}
                  style={{ marginLeft: "auto" }}
                >
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
