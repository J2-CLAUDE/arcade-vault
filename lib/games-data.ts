// Server-side data access layer — do NOT import in "use client" components.
// Uses lib/supabase/server.ts which requires next/headers (server-only).
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type GameWithStats =
  Database["public"]["Views"]["games_with_stats"]["Row"];

export type LeaderboardRow = Database["public"]["Tables"]["scores"]["Row"];

export type GlobalScoreRow = LeaderboardRow & {
  games: Pick<
    Database["public"]["Tables"]["games"]["Row"],
    "id" | "title" | "cat" | "color" | "cover"
  > | null;
};

export async function getGames(): Promise<GameWithStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function getGame(id: string): Promise<GameWithStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getGameLeaderboard(
  gameId: string,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getGlobalLeaderboard(
  limit = 200,
): Promise<GlobalScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*, games(id, title, cat, color, cover)")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as GlobalScoreRow[];
}

export function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
