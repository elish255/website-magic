import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, username, phone, county, is_active, balance, created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
