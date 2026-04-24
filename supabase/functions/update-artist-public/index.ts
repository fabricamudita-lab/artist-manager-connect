// Edge function: actualiza la ficha de un artista desde el formulario público
// validado con un token. Toda la validación se hace en el servidor con Zod.
//
// Seguridad:
// - El token valida quién puede editar (no usamos la sesión del usuario)
// - Zod valida formato/longitud de cada campo (previene payloads abusivos)
// - El cliente Supabase parametriza queries (no hay SQL injection)
// - Rechazamos cadenas con etiquetas <script para evitar XSS si en el futuro
//   se renderizan estos campos sin escape (React por defecto sí escapa)
// - Sin logs de payload sensible (NIF/IBAN)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ──────────────────────────────────────────────────────────────────────────
// Esquema Zod
// ──────────────────────────────────────────────────────────────────────────

// Cadena segura: trim + sin etiquetas <script + límite de longitud
const safeString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/<\s*script/i.test(s), {
      message: "Contenido no permitido",
    });

const optionalSafe = (max: number) =>
  safeString(max).optional().or(z.literal("").transform(() => undefined));

const PayloadSchema = z.object({
  // Identidad
  name: safeString(120).min(1, "El nombre es obligatorio"),
  stage_name: optionalSafe(120),
  description: optionalSafe(2000),
  genre: optionalSafe(200),

  // Contacto
  email: z
    .string()
    .trim()
    .email("Email no válido")
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d\s().-]{6,30}$/, "Teléfono no válido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: optionalSafe(500),

  // Redes
  instagram_url: optionalSafe(500),
  spotify_url: optionalSafe(500),
  tiktok_url: optionalSafe(500),

  // Empresa / fiscal
  company_name: optionalSafe(200),
  legal_name: optionalSafe(200),
  tax_id: optionalSafe(50),
  nif: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{8,15}$/i, "NIF/NIE no válido")
    .transform((s) => s.toUpperCase())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tipo_entidad: z
    .enum(["persona_fisica", "autonomo", "sociedad", ""])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  irpf_type: optionalSafe(50),
  irpf_porcentaje: z
    .union([z.coerce.number().min(0).max(50), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  actividad_inicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Bancarios
  iban: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[0-9A-Z\s]{13,32}$/i, "IBAN no válido")
    .transform((s) => s.replace(/\s+/g, " ").toUpperCase())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bank_name: optionalSafe(120),
  swift_code: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i,
      "SWIFT/BIC no válido",
    )
    .transform((s) => s.toUpperCase())
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Sociedad de gestión (PRO)
  ipi_number: z
    .string()
    .trim()
    .regex(/^\d{9,11}$/, "IPI debe tener 9-11 dígitos")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pro_name: optionalSafe(120),

  // Personal / logística
  clothing_size: optionalSafe(20),
  shoe_size: optionalSafe(20),
  allergies: optionalSafe(1000),
  special_needs: optionalSafe(1000),
  notes: optionalSafe(2000),

  // Custom data: cada valor capado a 2000 caracteres
  custom_data: z
    .record(z.string().max(2000))
    .optional()
    .refine((obj) => !obj || Object.keys(obj).length <= 100, {
      message: "Demasiados campos personalizados",
    }),

  // Social links (array de objetos {platform, url, label})
  social_links: z
    .array(
      z.object({
        platform: z.string().max(50),
        url: z.string().url().max(500),
        label: z.string().max(120).optional(),
      }),
    )
    .max(50)
    .optional(),
});

const RequestSchema = z.object({
  token: z.string().min(8).max(200),
  payload: PayloadSchema,
});

// ──────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed", message: "Use POST" } });
  }

  // Parse body con tope de tamaño implícito (Zod limita longitudes por campo)
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, {
      error: { code: "invalid_json", message: "Body no es JSON válido" },
    });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(422, {
      error: {
        code: "validation_error",
        message: "Datos no válidos",
        fields: parsed.error.flatten().fieldErrors,
      },
    });
  }
  const { token, payload } = parsed.data;

  // Cliente con service_role para saltarse RLS de forma controlada
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Validar token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("artist_form_tokens")
    .select("artist_id, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr) {
    console.error("Token lookup error:", tokenErr.message);
    return json(500, {
      error: { code: "server_error", message: "Error interno" },
    });
  }
  if (!tokenRow) {
    return json(401, {
      error: { code: "invalid_token", message: "Enlace no válido" },
    });
  }
  if (!tokenRow.is_active) {
    return json(401, {
      error: { code: "token_disabled", message: "Enlace desactivado" },
    });
  }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return json(401, {
      error: { code: "token_expired", message: "Enlace caducado" },
    });
  }

  // 2. Verificar que el artista existe
  const { data: artist, error: artistErr } = await supabase
    .from("artists")
    .select("id")
    .eq("id", tokenRow.artist_id)
    .maybeSingle();

  if (artistErr) {
    console.error("Artist lookup error:", artistErr.message);
    return json(500, {
      error: { code: "server_error", message: "Error interno" },
    });
  }
  if (!artist) {
    return json(404, {
      error: { code: "artist_not_found", message: "Artista no encontrado" },
    });
  }

  // 3. Construir update sólo con campos definidos
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) update[k] = v;
  }
  update.updated_at = new Date().toISOString();

  // 4. Persistir
  const { error: updErr } = await supabase
    .from("artists")
    .update(update)
    .eq("id", tokenRow.artist_id);

  if (updErr) {
    console.error("Update error:", updErr.message);
    return json(500, {
      error: { code: "update_failed", message: "No se pudo guardar" },
    });
  }

  return json(200, { ok: true, artist_id: tokenRow.artist_id });
});
