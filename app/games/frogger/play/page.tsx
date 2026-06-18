import { getGame } from "@/lib/games-data";
import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";

export default async function FroggerPlayPage() {
  const game = await getGame("frogger");
  if (!game) notFound();
  return <GamePlayer game={game} />;
}
