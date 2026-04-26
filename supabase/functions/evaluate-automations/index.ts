import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Batch 1: booking automation evaluators ──────────────────────────

interface AutomationConfig {
  id: string;
  workspace_id: string;
  automation_key: string;
  is_enabled: boolean;
  trigger_days: number | null;
  artist_ids: string[] | null;
}

interface MatchedEntity {
  entity_id: string;
  entity_type: string;
  title: string;
  message: string;
  user_id: string;
}

type Evaluator = (
  supabase: any,
  config: AutomationConfig
) => Promise<MatchedEntity[]>;

// Helper: artist filter clause
function artistFilter(config: AutomationConfig) {
  return config.artist_ids && config.artist_ids.length > 0
    ? config.artist_ids
    : null;
}

// 1. Booking offer without response after X days
const evaluateBookingOfferNoResponse: Evaluator = async (supabase, config) => {
  const days = config.trigger_days ?? 7;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const artists = artistFilter(config);

  let query = supabase
    .from("booking_offers")
    .select("id, festival_ciclo, ciudad, venue, artist_id, created_by, updated_at")
    .eq("phase", "interes")
    .lt("updated_at", cutoff);

  if (artists) query = query.in("artist_id", artists);

  const { data, error } = await query;
  if (error) { console.error("booking_offer_no_response query error:", error); return []; }

  return (data || []).map((b: any) => ({
    entity_id: b.id,
    entity_type: "booking_offer",
    title: "Oferta sin respuesta",
    message: `La oferta "${b.festival_ciclo || b.ciudad || "Sin nombre"}" lleva más de ${days} días sin actividad.`,
    user_id: b.created_by,
  }));
};

// 2. Negotiation stalled
const evaluateBookingNegotiationStalled: Evaluator = async (supabase, config) => {
  const days = config.trigger_days ?? 5;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const artists = artistFilter(config);

  let query = supabase
    .from("booking_offers")
    .select("id, festival_ciclo, ciudad, venue, artist_id, created_by, updated_at")
    .eq("phase", "negociacion")
    .lt("updated_at", cutoff);

  if (artists) query = query.in("artist_id", artists);

  const { data, error } = await query;
  if (error) { console.error("booking_negotiation_stalled query error:", error); return []; }

  return (data || []).map((b: any) => ({
    entity_id: b.id,
    entity_type: "booking_offer",
    title: "Negociación estancada",
    message: `"${b.festival_ciclo || b.ciudad || "Sin nombre"}" lleva más de ${days} días en negociación sin cambios.`,
    user_id: b.created_by,
  }));
};

// 3. Confirmed booking without contract
const evaluateBookingConfirmedNoContract: Evaluator = async (supabase, config) => {
  const artists = artistFilter(config);

  let query = supabase
    .from("booking_offers")
    .select("id, festival_ciclo, ciudad, venue, artist_id, created_by")
    .eq("estado", "confirmado");

  if (artists) query = query.in("artist_id", artists);

  const { data: bookings, error } = await query;
  if (error) { console.error("booking_confirmed_no_contract query error:", error); return []; }
  if (!bookings || bookings.length === 0) return [];

  // Get booking IDs that DO have a contract
  const bookingIds = bookings.map((b: any) => b.id);
  const { data: docs } = await supabase
    .from("booking_documents")
    .select("booking_id")
    .in("booking_id", bookingIds)
    .eq("document_type", "contrato");

  const hasContract = new Set((docs || []).map((d: any) => d.booking_id));

  return bookings
    .filter((b: any) => !hasContract.has(b.id))
    .map((b: any) => ({
      entity_id: b.id,
      entity_type: "booking_offer",
      title: "Booking confirmado sin contrato",
      message: `"${b.festival_ciclo || b.ciudad || "Sin nombre"}" está confirmado pero no tiene contrato adjunto.`,
      user_id: b.created_by,
    }));
};

// 4. Invoice missing (confirmed, date past, no invoice)
const evaluateBookingInvoiceMissing: Evaluator = async (supabase, config) => {
  const artists = artistFilter(config);
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("booking_offers")
    .select("id, festival_ciclo, ciudad, venue, artist_id, created_by, fecha")
    .eq("estado", "confirmado")
    .lt("fecha", today);

  if (artists) query = query.in("artist_id", artists);

  const { data: bookings, error } = await query;
  if (error) { console.error("booking_invoice_missing query error:", error); return []; }
  if (!bookings || bookings.length === 0) return [];

  const bookingIds = bookings.map((b: any) => b.id);
  const { data: docs } = await supabase
    .from("booking_documents")
    .select("booking_id")
    .in("booking_id", bookingIds)
    .eq("document_type", "factura");

  const hasInvoice = new Set((docs || []).map((d: any) => d.booking_id));

  return bookings
    .filter((b: any) => !hasInvoice.has(b.id))
    .map((b: any) => ({
      entity_id: b.id,
      entity_type: "booking_offer",
      title: "Factura pendiente",
      message: `"${b.festival_ciclo || b.ciudad || "Sin nombre"}" ya ocurrió y no tiene factura adjunta.`,
      user_id: b.created_by,
    }));
};

// 5. Contract signed but no payment received
const evaluateBookingSignedNoPayment: Evaluator = async (supabase, config) => {
  const artists = artistFilter(config);

  // Get confirmed bookings that have a signed contract
  let query = supabase
    .from("booking_offers")
    .select("id, festival_ciclo, ciudad, venue, artist_id, created_by")
    .eq("estado", "confirmado");

  if (artists) query = query.in("artist_id", artists);

  const { data: bookings, error } = await query;
  if (error) { console.error("booking_signed_no_payment query error:", error); return []; }
  if (!bookings || bookings.length === 0) return [];

  const bookingIds = bookings.map((b: any) => b.id);

  // Find bookings with signed contracts
  const { data: signedDocs } = await supabase
    .from("booking_documents")
    .select("booking_id")
    .in("booking_id", bookingIds)
    .eq("document_type", "contrato")
    .eq("status", "signed");

  const hasSigned = new Set((signedDocs || []).map((d: any) => d.booking_id));
  const signedBookings = bookings.filter((b: any) => hasSigned.has(b.id));
  if (signedBookings.length === 0) return [];

  // Find bookings with completed income transactions
  const signedIds = signedBookings.map((b: any) => b.id);
  const { data: payments } = await supabase
    .from("transactions")
    .select("booking_id")
    .in("booking_id", signedIds)
    .eq("transaction_type", "income")
    .in("status", ["confirmed", "paid"]);

  const hasPaid = new Set((payments || []).map((p: any) => p.booking_id));

  return signedBookings
    .filter((b: any) => !hasPaid.has(b.id))
    .map((b: any) => ({
      entity_id: b.id,
      entity_type: "booking_offer",
      title: "Pago pendiente",
      message: `"${b.festival_ciclo || b.ciudad || "Sin nombre"}" tiene contrato firmado pero no se ha registrado el pago.`,
      user_id: b.created_by,
    }));
};

// ── Registry ────────────────────────────────────────────────────────

const EVALUATORS: Record<string, Evaluator> = {
  booking_offer_no_response: evaluateBookingOfferNoResponse,
  booking_negotiation_stalled: evaluateBookingNegotiationStalled,
  booking_confirmed_no_contract: evaluateBookingConfirmedNoContract,
  booking_invoice_missing: evaluateBookingInvoiceMissing,
  booking_signed_no_payment: evaluateBookingSignedNoPayment,
};

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all workspaces that have enabled automation configs
    const { data: configs, error: cfgError } = await supabase
      .from("automation_configs")
      .select("*")
      .eq("is_enabled", true);

    if (cfgError) {
      console.error("Error fetching configs:", cfgError);
      return new Response(JSON.stringify({ error: cfgError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No active automations", fired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFired = 0;

    for (const config of configs) {
      const evaluator = EVALUATORS[config.automation_key];
      if (!evaluator) continue; // Not in Batch 1, skip

      const matches = await evaluator(supabase, config as AutomationConfig);

      for (const match of matches) {
        // Check dedup: has this already fired?
        const { data: existing } = await supabase
          .from("automation_executions")
          .select("id")
          .eq("workspace_id", config.workspace_id)
          .eq("automation_key", config.automation_key)
          .eq("entity_id", match.entity_id)
          .maybeSingle();

        if (existing) continue; // Already fired

        // Insert notification
        const { data: notif, error: notifErr } = await supabase
          .from("notifications")
          .insert({
            user_id: match.user_id,
            title: match.title,
            message: match.message,
            type: "general",
            related_id: match.entity_id,
          })
          .select("id")
          .single();

        if (notifErr) {
          console.error("Error inserting notification:", notifErr);
          continue;
        }

        // Insert execution log
        const { error: execErr } = await supabase
          .from("automation_executions")
          .insert({
            workspace_id: config.workspace_id,
            automation_key: config.automation_key,
            entity_id: match.entity_id,
            entity_type: match.entity_type,
            notification_id: notif?.id ?? null,
          });

        if (execErr) {
          console.error("Error inserting execution:", execErr);
          continue;
        }

        totalFired++;
      }
    }

    console.log(`evaluate-automations completed: ${totalFired} notifications created`);

    return new Response(
      JSON.stringify({ message: "OK", fired: totalFired }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
