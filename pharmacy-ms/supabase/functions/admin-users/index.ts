import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_ROLES = ["super_admin", "admin"];
const ROLE_HIERARCHY: Record<string, number> = {
    super_admin: 5,
    admin: 4,
    pharmacist: 3,
    inventory_staff: 2,
    cashier: 1,
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const authHeader = req.headers.get("Authorization");

        console.log("Auth header present:", !!authHeader);

        if (!authHeader) {
            console.error("Missing Authorization header!");
            return jsonResponse({ error: "Missing Authorization header" }, 401);
        }

        // Client for verifying the caller
        const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Verify caller identity
        const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !caller) {
            console.error("Auth error:", authError?.message || "No caller returned");
            return jsonResponse({ error: "Unauthorized: Invalid token", details: authError?.message }, 401);
        }

        console.log("Caller ID:", caller.id);

        // Get caller's role
        const { data: callerProfile, error: profileError } = await createClient(supabaseUrl, serviceRoleKey)
            .from("profiles")
            .select("role, branch_id")
            .eq("id", caller.id)
            .single();

        if (profileError) {
            console.error("Profile error:", profileError.message);
        }

        if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
            console.error("Forbidden: Caller role is", callerProfile?.role);
            return jsonResponse({ error: "Forbidden: Admin access required" }, 403);
        }

        const body = await req.json();
        const { action } = body;

        // Admin client with service role
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        switch (action) {
            // ─── LIST USERS ────────────────────────────────────
            case "list": {
                const { page = 1, perPage = 20, search, roleFilter, statusFilter } = body;

                // Get users from auth.users via admin API
                const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({
                    page,
                    perPage,
                });

                if (listError) {
                    console.error("List users error:", listError.message);
                    return jsonResponse({ error: listError.message }, 500);
                }

                // Get all profiles with filters
                let query = adminClient.from("profiles").select("*", { count: "exact" });

                if (search) {
                    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
                }
                if (roleFilter && roleFilter !== "all") {
                    query = query.eq("role", roleFilter);
                }
                if (statusFilter === "active") {
                    query = query.eq("is_active", true);
                } else if (statusFilter === "inactive") {
                    query = query.eq("is_active", false);
                }

                // Non-super_admin can only see their branch
                if (callerProfile.role !== "super_admin") {
                    query = query.eq("branch_id", callerProfile.branch_id);
                }

                const offset = (page - 1) * perPage;
                query = query.order("created_at", { ascending: false }).range(offset, offset + perPage - 1);

                const { data: profiles, count, error: profilesError } = await query;
                if (profilesError) {
                    console.error("Profiles query error:", profilesError.message);
                    return jsonResponse({ error: profilesError.message }, 500);
                }

                // Merge auth.users metadata (last_sign_in_at) into profiles
                const authUsersMap = new Map(
                    (authData?.users || []).map((u) => [u.id, u])
                );

                const users = (profiles || []).map((p) => {
                    const authUser = authUsersMap.get(p.id);
                    return {
                        ...p,
                        last_sign_in_at: authUser?.last_sign_in_at || null,
                        email_confirmed_at: authUser?.email_confirmed_at || null,
                        invite_pending: !authUser?.last_sign_in_at,
                    };
                });

                return jsonResponse({
                    users,
                    total: count || 0,
                    page,
                    perPage,
                    totalPages: Math.ceil((count || 0) / perPage),
                });
            }

            // ─── CREATE USER ───────────────────────────────────
            case "create": {
                const { email, password, full_name, role, branch_id, phone } = body;

                if (!email || !password || !full_name || !role) {
                    return jsonResponse({ error: "Missing required fields" }, 400);
                }

                // Prevent privilege escalation
                const callerLevel = ROLE_HIERARCHY[callerProfile.role] || 0;
                const targetLevel = ROLE_HIERARCHY[role] || 0;
                if (targetLevel >= callerLevel) {
                    return jsonResponse(
                        { error: "Cannot create a user with equal or higher role" },
                        403
                    );
                }

                // Non-super_admin can only create in their branch
                const assignBranch = callerProfile.role === "super_admin"
                    ? branch_id
                    : callerProfile.branch_id;

                // Create auth user
                const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name, role },
                });

                if (createError) {
                    console.error("Create user error:", createError.message);
                    return jsonResponse({ error: createError.message }, 400);
                }

                // Update the auto-created profile with correct role + branch
                const { error: updateError } = await adminClient
                    .from("profiles")
                    .update({
                        full_name,
                        role,
                        branch_id: assignBranch,
                        phone: phone || null,
                    })
                    .eq("id", newUser.user.id);

                if (updateError) {
                    console.error("Update profile error:", updateError.message);
                    return jsonResponse({ error: updateError.message }, 500);
                }

                return jsonResponse({ user: newUser.user, message: "User created" }, 201);
            }

            // ─── UPDATE USER ───────────────────────────────────
            case "update": {
                const { user_id, full_name, phone, role, branch_id, is_active } = body;

                if (!user_id) {
                    return jsonResponse({ error: "user_id is required" }, 400);
                }

                // Get target user's current role
                const { data: targetProfile } = await adminClient
                    .from("profiles")
                    .select("role")
                    .eq("id", user_id)
                    .single();

                if (!targetProfile) {
                    return jsonResponse({ error: "User not found" }, 404);
                }

                // Prevent managing users at or above your level
                const callerLvl = ROLE_HIERARCHY[callerProfile.role] || 0;
                const targetLvl = ROLE_HIERARCHY[targetProfile.role] || 0;
                if (targetLvl >= callerLvl) {
                    return jsonResponse(
                        { error: "Cannot modify a user with equal or higher role" },
                        403
                    );
                }

                // If changing role, new role must be below caller
                if (role) {
                    const newLvl = ROLE_HIERARCHY[role] || 0;
                    if (newLvl >= callerLvl) {
                        return jsonResponse(
                            { error: "Cannot assign a role equal to or above your own" },
                            403
                        );
                    }
                }

                const updates: Record<string, unknown> = {};
                if (full_name !== undefined) updates.full_name = full_name;
                if (phone !== undefined) updates.phone = phone;
                if (role !== undefined) updates.role = role;
                if (is_active !== undefined) updates.is_active = is_active;
                if (callerProfile.role === "super_admin" && branch_id !== undefined) {
                    updates.branch_id = branch_id;
                }

                const { error: updError } = await adminClient
                    .from("profiles")
                    .update(updates)
                    .eq("id", user_id);

                if (updError) {
                    console.error("Update error:", updError.message);
                    return jsonResponse({ error: updError.message }, 500);
                }

                // If deactivating, revoke all sessions
                if (is_active === false) {
                    await adminClient.auth.admin.signOut(user_id, "global");
                }

                return jsonResponse({ message: "User updated" });
            }

            default:
                return jsonResponse({ error: `Unknown action: ${action}` }, 400);
        }
    } catch (err) {
        console.error("Unhandled error:", err);
        return jsonResponse({ error: (err as Error).message }, 500);
    }
});
