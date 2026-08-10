import { Tag } from "@/components/ui/tag";

export function ChampionTag({ name }: { name: string | null }) {
  return (
    <div
      aria-live="polite"
      style={{ marginTop: "22px", display: "flex", alignItems: "center", gap: "10px" }}
    >
      {name ? (
        <Tag tone="accent" size="md">
          Champion: {name}
        </Tag>
      ) : null}
    </div>
  );
}
