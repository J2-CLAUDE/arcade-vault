import { getGames } from "@/lib/games-data";
import Library from "@/components/library";

export default async function Page() {
  const games = await getGames();
  return <Library games={games} />;
}
