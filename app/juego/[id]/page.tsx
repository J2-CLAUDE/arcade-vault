import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { getGame, getGameLeaderboard } from "@/lib/games-data";
import GameDetail from "@/components/game-detail";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [game, rawScores] = await Promise.all([
    getGame(id),
    getGameLeaderboard(id, 10),
  ]);
  if (!game) notFound();

  const scores = rawScores.map((s, i) => ({
    rank: i + 1,
    name: s.player_name,
    score: s.score,
    date: new Date(s.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));

  return <GameDetail game={game} scores={scores} />;
}
