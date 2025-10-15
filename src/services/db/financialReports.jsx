import { supabase } from "../supabaseClient";

export async function createFinancialReport({ year, file_path, author }) {
  const { error } = await supabase
    .from("financial_reports")
    .insert({ year, file_path, author });
  if (error) throw error;
}

export async function fetchFinancialReports() {
  const { data, error } = await supabase
    .from("financial_reports")
    .select("id, year, file_path, author, created_at")
    .order("year", { ascending: false });
  if (error) throw error;
  return data || [];
}
