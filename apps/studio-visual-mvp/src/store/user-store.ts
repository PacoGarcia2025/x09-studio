import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

export type UserProfile = {
  name: string;
  email: string;
  whatsapp: string;
  instagram: string;
  logoUrl: string;
};

type UserState = UserProfile & {
  session: Session | null;
  isAuthReady: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearUser: () => void;
};

const emptyProfile: UserProfile = {
  name: "",
  email: "",
  whatsapp: "",
  instagram: "",
  logoUrl: "",
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  logo_url?: string | null;
};

function rowToProfile(row: ProfileRow, fallbackEmail = ""): UserProfile {
  return {
    name: row.full_name ?? row.name ?? "",
    email: row.email ?? fallbackEmail,
    whatsapp: row.whatsapp ?? "",
    instagram: row.instagram ?? "",
    logoUrl: row.logo_url ?? "",
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...emptyProfile,
      session: null,
      isAuthReady: false,

      setSession: (session) => set({ session, isAuthReady: true }),

      clearUser: () =>
        set({
          ...emptyProfile,
          session: null,
        }),

      fetchProfile: async () => {
        const session = get().session;
        if (!session?.user?.id) {
          set({ ...emptyProfile });
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("[user-store] fetchProfile:", error.message);
          return;
        }

        if (!data) {
          set({
            ...emptyProfile,
            email: session.user.email ?? "",
          });
          return;
        }

        set(rowToProfile(data as ProfileRow, session.user.email ?? ""));
      },

      updateProfile: async (data) => {
        const session = get().session;
        if (!session?.user?.id) {
          return { error: "Faça login para salvar o perfil." };
        }

        const next: UserProfile = {
          name: data.name ?? get().name,
          email: data.email ?? get().email,
          whatsapp: data.whatsapp ?? get().whatsapp,
          instagram: data.instagram ?? get().instagram,
          logoUrl: data.logoUrl ?? get().logoUrl,
        };

        // Atualiza UI imediatamente
        set(next);

        const { error } = await supabase.from("profiles").upsert(
          {
            id: session.user.id,
            full_name: next.name,
            email: next.email,
            whatsapp: next.whatsapp,
            instagram: next.instagram,
            logo_url: next.logoUrl,
          },
          { onConflict: "id" },
        );

        if (error) {
          console.warn("[user-store] updateProfile:", error.message);
          return { error: error.message };
        }

        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        get().clearUser();
      },
    }),
    {
      name: "x09-user-profile",
      // Sessão fica no storage do Supabase Auth — persistimos só o perfil local
      partialize: (state) => ({
        name: state.name,
        email: state.email,
        whatsapp: state.whatsapp,
        instagram: state.instagram,
        logoUrl: state.logoUrl,
      }),
    },
  ),
);
