import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    let transitioned_to_realizado = 0;
    let alerts_created = 0;
    let stale_offers_flagged = 0;

    // ── TRANSITION 1: Confirmado → Realizado ────────────────────────
    {
      const { data: pastEvents, error } = await supabase
        .from("booking_offers")
        .select("id, festival_ciclo, ciudad, venue, created_by")
        .eq("phase", "confirmado")
        .lt("fecha", today);

      if (error) {
        console.error("T1 fetch error:", error);
      } else if (pastEvents && pastEvents.length > 0) {
        const ids = pastEvents.map((e: any) => e.id);

        const { error: updateError } = await supabase
          .from("booking_offers")
          .update({ phase: "realizado" })
          .in("id", ids);

        if (updateError) {
          console.error("T1 update error:", updateError);
        } else {
          transitioned_to_realizado = ids.length;

          // Log transition notifications
          for (const event of pastEvents) {
            await supabase
              .from("booking_notifications")
              .upsert(
                {
                  booking_offer_id: event.id,
                  type: "transition",
                  message: `"${event.festival_ciclo || event.ciudad || event.venue || "Evento"}" movido a Realizado automáticamente`,
                },
                { onConflict: "booking_offer_id,type" }
              );
          }

          // Also log in booking_history
          for (const event of pastEvents) {
            await supabase.from("booking_history").insert({
              booking_id: event.id,
              event_type: "phase_change",
              field_changed: "phase",
              previous_value: JSON.stringify("confirmado"),
              new_value: JSON.stringify("realizado"),
              changed_by: event.created_by,
              metadata: { source: "auto-booking-transitions", reason: "fecha < today" },
            });
          }
        }
      }
    }

    // ── TRANSITION 2: Realizado aging alerts ─────────────────────────
    {
      const { data: realizados, error } = await supabase
        .from("booking_offers")
        .select("id, festival_ciclo, ciudad, venue, fecha")
        .eq("phase", "realizado");

      if (error) {
        console.error("T2 fetch error:", error);
      } else if (realizados) {
        for (const event of realizados) {
          if (!event.fecha) continue;

          const eventDate = new Date(event.fecha);
          const daysSince = Math.floor(
            (now.getTime() - eventDate.getTime()) / 86400000
          );
          const name =
            event.festival_ciclo || event.ciudad || event.venue || "Evento";

          // 30-day alert (takes priority)
          if (daysSince >= 30) {
            const { error: upsertErr } = await supabase
              .from("booking_notifications")
              .upsert(
                {
                  booking_offer_id: event.id,
                  type: "cobro_30d",
                  message: `⚠ Cobro vencido — "${name}" lleva ${daysSince} días sin facturar`,
                },
                { onConflict: "booking_offer_id,type" }
              );
            if (!upsertErr) alerts_created++;
          }
          // 7-day alert
          else if (daysSince >= 7) {
            const { error: upsertErr } = await supabase
              .from("booking_notifications")
              .upsert(
                {
                  booking_offer_id: event.id,
                  type: "cobro_7d",
                  message: `Cobro pendiente — "${name}" lleva ${daysSince} días sin facturar`,
                },
                { onConflict: "booking_offer_id,type" }
              );
            if (!upsertErr) alerts_created++;
          }
        }
      }
    }

    // ── TRANSITION 3: Oferta/Negociación staleness ──────────────────
    {
      const thirtyDaysAgo = new Date(
        now.getTime() - 30 * 86400000
      ).toISOString();

      const { data: staleOffers, error } = await supabase
        .from("booking_offers")
        .select("id, festival_ciclo, ciudad, venue, phase")
        .in("phase", ["oferta", "negociacion"])
        .lt("updated_at", thirtyDaysAgo);

      if (error) {
        console.error("T3 fetch error:", error);
      } else if (staleOffers) {
        for (const event of staleOffers) {
          const name =
            event.festival_ciclo || event.ciudad || event.venue || "Evento";

          const { error: upsertErr } = await supabase
            .from("booking_notifications")
            .upsert(
              {
                booking_offer_id: event.id,
                type: "stale_30d",
                message: `Oferta sin actividad — "${name}" lleva más de 30 días en ${event.phase}`,
              },
              { onConflict: "booking_offer_id,type" }
            );
          if (!upsertErr) stale_offers_flagged++;
        }
      }
    }

    const result = {
      transitioned_to_realizado,
      alerts_created,
      stale_offers_flagged,
      timestamp: now.toISOString(),
    };

    console.log("auto-booking-transitions completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
