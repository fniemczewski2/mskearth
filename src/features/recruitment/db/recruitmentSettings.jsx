import { supabase } from "../../../services/supabaseClient";

// TODO: remove the fallback once supabase/migrations/20260818_recruitments_steps.sql
// has been applied to every environment.
export async function getRecruitmentSettings() {
  const withSteps = await supabase
    .from("recruitments")
    .select("id, instagram, form, steps")
    .limit(1)
    .maybeSingle();

  if (!withSteps.error) return withSteps.data || null;

  const fallback = await supabase
    .from("recruitments")
    .select("id, instagram, form")
    .limit(1)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data ? { ...fallback.data, steps: [] } : null;
}

export async function replaceRecruitmentSettings({ instagram, form, steps }) {
  const del = await supabase.from("recruitments").delete().not("id", "is", null);
  if (del.error) throw del.error;

  const ins = await supabase.from("recruitments").insert({ instagram, form, steps: steps ?? [] });
  if (!ins.error) return;

  // steps column not migrated yet, save without it
  const insFallback = await supabase.from("recruitments").insert({ instagram, form });
  if (insFallback.error) throw insFallback.error;
}
