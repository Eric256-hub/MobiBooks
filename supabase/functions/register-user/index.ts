import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: corsHeaders,
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only POST is allowed
  if (req.method !== "POST") {
    return jsonResponse({
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    // Read request body
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        success: false,
        error: "Invalid request data.",
      });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    const businessType = String(body.businessType ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    // Validate required fields
    if (
      !email ||
      !password ||
      !fullName ||
      !businessName ||
      !businessType
    ) {
      return jsonResponse({
        success: false,
        error: "Please complete all required registration fields.",
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return jsonResponse({
        success: false,
        error: "Please enter a valid email address.",
      });
    }

    // Validate password
    if (password.length < 6) {
      return jsonResponse({
        success: false,
        error: "Password must be at least 6 characters long.",
      });
    }

    // Validate names
    if (fullName.length < 2) {
      return jsonResponse({
        success: false,
        error: "Please enter your full name.",
      });
    }

    if (businessName.length < 2) {
      return jsonResponse({
        success: false,
        error: "Please enter your business name.",
      });
    }

    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
      );

      return jsonResponse({
        success: false,
        error:
          "Server configuration error. Please contact the administrator.",
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create user.
    //
    // email_confirm: true means the account is immediately confirmed.
    // Supabase will NOT require an email confirmation step.
    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          business_name: businessName,
          business_type: businessType,
          phone,
        },
      });

    // Supabase returned an error
    if (error) {
      console.error(
        "Supabase user creation error:",
        error.message
      );

      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("already") ||
        errorMessage.includes("registered") ||
        errorMessage.includes("exists")
      ) {
        return jsonResponse({
          success: false,
          error:
            "An account with this email already exists. Please sign in instead.",
        });
      }

      if (
        errorMessage.includes("password") &&
        errorMessage.includes("weak")
      ) {
        return jsonResponse({
          success: false,
          error:
            "This password is too weak. Please choose a stronger password.",
        });
      }

      return jsonResponse({
        success: false,
        error: error.message,
      });
    }

    if (!data.user) {
      console.error("User creation returned no user.");

      return jsonResponse({
        success: false,
        error: "Account could not be created. Please try again.",
      });
    }

    // Success
    console.log(
      `User created successfully: ${data.user.id}`
    );

    return jsonResponse({
      success: true,
      message:
        "Account created successfully. You can now sign in.",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("Unexpected registration error:", error);

    return jsonResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create account. Please try again.",
    });
  }
});