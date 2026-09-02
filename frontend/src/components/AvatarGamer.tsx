import { avatarDe } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Avatar del usuario: su foto subida o un personaje generado a partir del nickname. */
export function AvatarGamer({
  nickname,
  avatar,
  className,
}: {
  nickname: string;
  avatar?: string;
  className?: string;
}) {
  return (
    <img
      src={avatarDe({ nickname, avatar })}
      alt={`Avatar de ${nickname}`}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-full border border-border bg-secondary object-cover",
        className ?? "h-11 w-11",
      )}
    />
  );
}
