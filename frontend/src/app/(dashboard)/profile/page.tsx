"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/auth";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*, departments(name)")
      .eq("id", user.id)
      .single();

    if (data) {
      const profileData = {
        ...data,
        email: data.email || user.email || "",
      } as UserProfile & { departments?: { name: string } | null };
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setPhone(profileData.phone || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Profile updated successfully.");
      setEditing(false);
      await fetchProfile();
    }
    setSaving(false);
  }

  const departmentName =
    (profile as UserProfile & { departments?: { name: string } | null })
      ?.departments?.name || "Not assigned";

  return (
    <MainContent
      title="Profile"
      description="View and update your personal information."
    >
      <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-background p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted">Full Name</p>
                  <Skeleton className="mt-1 h-5 w-40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Email</p>
                  <Skeleton className="mt-1 h-5 w-48" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Department</p>
                  <Skeleton className="mt-1 h-5 w-32" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Role</p>
                  <Skeleton className="mt-1 h-5 w-24" />
                </div>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {!editing ? (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted">
                        Full Name
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {profile.full_name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Email</p>
                      <p className="mt-1 text-sm text-foreground">
                        {profile.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">
                        Department
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {departmentName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Role</p>
                      <p className="mt-1 text-sm capitalize text-foreground">
                        {profile.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Phone</p>
                      <p className="mt-1 text-sm text-foreground">
                        {profile.phone || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">
                        Member Since
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {message && (
                    <p className="text-sm text-success">{message}</p>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(true);
                      setMessage("");
                    }}
                  >
                    Edit Profile
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <FormInput
                    label="Full Name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <FormInput
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted">Email</p>
                      <p className="mt-1 text-sm text-foreground">
                        {profile.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Role</p>
                      <p className="mt-1 text-sm capitalize text-foreground">
                        {profile.role}
                      </p>
                    </div>
                  </div>

                  {message && (
                    <p className="text-sm text-destructive">{message}</p>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditing(false);
                        setFullName(profile.full_name || "");
                        setPhone(profile.phone || "");
                        setMessage("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Unable to load profile. Please try again.
            </p>
          )}
        </div>
      </div>
    </MainContent>
  );
}
