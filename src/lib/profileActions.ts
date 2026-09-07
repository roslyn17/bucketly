"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Persists an avatar URL -- a public Storage URL for an already-uploaded
 * photo (the upload itself happens client-side; this just saves the
 * resulting URL to the profile). There's no preset picker anymore -- users
 * either upload a photo or keep the default silhouette -- so this only
 * ever has to accept their own Storage folder. */
export async function updateAvatarUrl(avatarUrl: string) {
  const { supabase, user } = await requireUser();

  const isOwnUpload = avatarUrl.includes(`/avatars/${user.id}/`);
  if (!isOwnUpload) {
    throw new Error("Invalid avatar URL");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

const MAX_DISPLAY_NAME_LENGTH = 40;

/** Updates the user's display name (shown instead of their email around the
 * app). Passing an empty/whitespace-only string clears it, so the UI falls
 * back to the local part of their email address. */
export async function updateDisplayName(name: string) {
  const { supabase, user } = await requireUser();

  const trimmed = name.trim();
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    // There's no separate "username" field -- display_name doubles as the
    // public profile handle at /u/[display_name] (see the unique index in
    // 20260904000001_add_profile_public_sharing.sql), so it has to be
    // unique. 23505 = Postgres unique_violation.
    if (error.code === "23505") throw new Error("That name is already taken. Try another.");
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/u/[username]", "page");
}

/**
 * Turns the user's public profile (/u/[display_name]) on or off. All or
 * nothing -- there's no per-list visibility. Since display_name doubles as
 * the public URL's handle, turning sharing on requires one to already be
 * set; otherwise the link on a share card would point at nothing.
 */
export async function updateProfileVisibility(isPublic: boolean) {
  const { supabase, user } = await requireUser();

  if (isPublic) {
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    if (fetchError) throw fetchError;
    if (!profile?.display_name) {
      throw new Error(
        "Set a display name before making your profile public -- it's used as your public profile's URL.",
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath("/u/[username]", "page");
}
