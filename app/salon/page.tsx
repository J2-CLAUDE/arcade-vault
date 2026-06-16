import { getGames, getGlobalLeaderboard } from "@/lib/games-data";
import HallOfFame from "@/components/hall-of-fame";

export default async function Page() {
  const [games, scores] = await Promise.all([
    getGames(),
    getGlobalLeaderboard(),
  ]);
  return <HallOfFame games={games} scores={scores} />;
}
