// Browser-side data mutations — safe to import in "use client" components.
import { createClient } from "@/lib/supabase/client";

export async function saveScore(params: {
  game_id: string;
  player_name: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert(params);
  if (error) throw error;
}

export async function incrementPlay(gameId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_play", {
    p_game_id: gameId,
  });
  if (error) throw error;
}
