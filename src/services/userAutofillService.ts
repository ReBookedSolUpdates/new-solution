import { supabase } from "@/lib/supabase";

export class UserAutofillService {
  static async getUserInfo(): Promise<{ name: string; email: string } | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      // Get user profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (error) {
      }

      return {
        name: profile?.name || "",
        email: user.email || "",
      };
    } catch (error) {
      return null;
    }
  }
}
