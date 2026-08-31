import { avatarDe } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Avatar de caricatura determinista generado a partir del nickname. */
export function AvatarGamer({ nickname, className }: { nickname: string; className?: string }) {
  return (
    <img
      src={avatarDe({ nickname })}
      alt={`Avatar de ${nickname}`}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-full border border-border bg-secondary object-cover",
        className ?? "h-11 w-11",
      )}
    />
  );
}
