import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Link2, Zap } from "lucide-react";

/* ── Phase maps per entity type ──────────────────────────────── */

interface PhaseConfig {
  id: string;
  label: string;
  color: string;       // tailwind ring / bg for "current"
  textColor: string;   // label text when current
}

const SHOW_PHASES: PhaseConfig[] = [
  { id: "interes",      label: "Interés",      color: "bg-blue-500",   textColor: "text-blue-600 dark:text-blue-400" },
  { id: "negociacion",  label: "Negociación",  color: "bg-amber-500",  textColor: "text-amber-600 dark:text-amber-400" },
  { id: "confirmado",   label: "Confirmado",   color: "bg-green-500",  textColor: "text-green-600 dark:text-green-400" },
  { id: "completado",   label: "Completado",   color: "bg-emerald-600",textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "cancelado",    label: "Cancelado",    color: "bg-red-500",    textColor: "text-red-600 dark:text-red-400" },
];

const RELEASE_PHASES: PhaseConfig[] = [
  { id: "produccion",   label: "Producción",   color: "bg-blue-500",   textColor: "text-blue-600 dark:text-blue-400" },
  { id: "masterizado",  label: "Masterizado",  color: "bg-violet-500", textColor: "text-violet-600 dark:text-violet-400" },
  { id: "distribucion", label: "Distribución", color: "bg-amber-500",  textColor: "text-amber-600 dark:text-amber-400" },
  { id: "lanzado",      label: "Lanzado",      color: "bg-green-500",  textColor: "text-green-600 dark:text-green-400" },
];

const SYNC_PHASES: PhaseConfig[] = [
  { id: "solicitud",       label: "Solicitud",        color: "bg-blue-500",   textColor: "text-blue-600 dark:text-blue-400" },
  { id: "cotizacion",      label: "Cotización",       color: "bg-violet-500", textColor: "text-violet-600 dark:text-violet-400" },
  { id: "negociacion",     label: "Negociación",      color: "bg-amber-500",  textColor: "text-amber-600 dark:text-amber-400" },
  { id: "licencia_firmada",label: "Licencia Firmada", color: "bg-green-500",  textColor: "text-green-600 dark:text-green-400" },
  { id: "facturado",       label: "Facturado",        color: "bg-emerald-600",textColor: "text-emerald-600 dark:text-emerald-400" },
];

const ENTITY_PHASE_MAP: Record<string, PhaseConfig[]> = {
  show: SHOW_PHASES,
  release: RELEASE_PHASES,
  sync: SYNC_PHASES,
  videoclip: RELEASE_PHASES,
  prensa: SHOW_PHASES,
  merch: SHOW_PHASES,
};

/* ── Next actions map (best-practice tasks per transition) ──── */

const NEXT_ACTIONS_MAP: Record<string, Record<string, string[]>> = {
  show: {
    interes: [
      "Enviar disponibilidad de fechas al promotor",
      "Compartir rider técnico actualizado",
      "Solicitar condiciones económicas del venue",
    ],
    negociacion: [
      "Solicitar contrato firmado al promotor",
      "Facturar anticipo del 50%",
      "Añadir al plan de PR y comunicación",
      "Coordinar logística de viaje",
    ],
    confirmado: [
      "Confirmar soundcheck y horarios",
      "Enviar lista de invitados",
      "Preparar setlist y producción",
    ],
  },
  release: {
    produccion: [
      "Finalizar mezcla con el ingeniero",
      "Aprobar masters de todas las pistas",
      "Registrar ISRC y metadatos",
    ],
    masterizado: [
      "Subir a distribuidora digital",
      "Configurar pre-save y pitch editorial",
      "Preparar assets de lanzamiento",
    ],
    distribucion: [
      "Publicar en redes sociales",
      "Activar campaña de ads",
      "Enviar a medios y playlists",
    ],
  },
  sync: {
    solicitud: [
      "Preparar cotización según brief",
      "Verificar derechos y splits disponibles",
    ],
    cotizacion: [
      "Negociar términos con el supervisor",
      "Revisar contrato de licencia",
    ],
    negociacion: [
      "Firmar contrato de licencia",
      "Enviar stems y archivos master",
    ],
    licencia_firmada: [
      "Emitir factura por fee de sync",
      "Registrar ingreso en contabilidad",
    ],
  },
};

/* ── Entity type config ─────────────────────────────────────── */

const ENTITY_TYPE_CONFIG: Record<string, { emoji: string; label: string }> = {
  show:      { emoji: "🎤", label: "Show" },
  release:   { emoji: "💿", label: "Release" },
  sync:      { emoji: "🎬", label: "Sync" },
  videoclip: { emoji: "📹", label: "Videoclip" },
  prensa:    { emoji: "📰", label: "Prensa" },
  merch:     { emoji: "👕", label: "Merch" },
};

/* ── Helpers ────────────────────────────────────────────────── */

function normalizePhase(phase?: string | null): string {
  if (!phase) return "";
  return phase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function getCurrentPhaseIndex(phases: PhaseConfig[], entityStatus?: string | null): number {
  const normalized = normalizePhase(entityStatus);
  if (!normalized) return 0;
  const idx = phases.findIndex((p) => p.id === normalized);
  return idx >= 0 ? idx : 0;
}

/* ── Component ──────────────────────────────────────────────── */

interface ProjectWorkflowsTabProps {
  tasks: any[];
  budgets: any[];
  solicitudes: any[];
  linkedEntities?: any[];
}

export function ProjectWorkflowsTab({
  linkedEntities = [],
}: ProjectWorkflowsTabProps) {
  const entitiesWithPhases = useMemo(() => {
    return linkedEntities
      .filter((e) => ENTITY_PHASE_MAP[e.entity_type])
      .map((entity) => {
        const phases = ENTITY_PHASE_MAP[entity.entity_type] || SHOW_PHASES;
        const currentIdx = getCurrentPhaseIndex(phases, entity.entity_status);
        const nextPhase = currentIdx < phases.length - 1 ? phases[currentIdx + 1] : null;
        const actionsKey = entity.entity_type;
        const currentPhaseId = phases[currentIdx]?.id;
        const nextActions = nextPhase
          ? (NEXT_ACTIONS_MAP[actionsKey]?.[currentPhaseId] || [])
          : [];

        return {
          ...entity,
          phases,
          currentIdx,
          nextPhase,
          nextActions,
        };
      });
  }, [linkedEntities]);

  return (
    <div className="space-y-6">
      {/* Banner explicativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚡</span>
            <div>
              <h3 className="font-semibold text-base mb-1">Motor de workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cuando cambias el estado de una entidad, el sistema detecta la transición y activa
                automáticamente las tareas que corresponden según el workflow de la industria musical.
                Pruébalo: cambia el estado de cualquier entidad abajo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {entitiesWithPhases.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Link2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sin entidades vinculadas</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Vincula shows, releases o sincronizaciones a este proyecto para ver su progreso
              en el motor de workflows.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entity cards with steppers */}
      <div className="space-y-4">
        {entitiesWithPhases.map((entity) => {
          const typeConfig = ENTITY_TYPE_CONFIG[entity.entity_type] || { emoji: "📋", label: entity.entity_type };
          const MAX_ACTIONS_SHOWN = 3;
          const visibleActions = entity.nextActions.slice(0, MAX_ACTIONS_SHOWN);
          const extraActions = entity.nextActions.length - MAX_ACTIONS_SHOWN;

          return (
            <Card key={entity.id} className="overflow-hidden">
              <CardContent className="p-5">
                {/* Entity header + stepper */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left: entity info */}
                  <div className="flex items-center gap-3 min-w-0 lg:w-[280px] shrink-0">
                    <span className="text-2xl">{typeConfig.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {entity.entity_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {typeConfig.label}
                        {entity.entity_date && (
                          <> · {new Date(entity.entity_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: phase stepper */}
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex items-center gap-0 min-w-max">
                      {entity.phases.map((phase: PhaseConfig, idx: number) => {
                        const isCompleted = idx < entity.currentIdx;
                        const isCurrent = idx === entity.currentIdx;
                        const isFuture = idx > entity.currentIdx;

                        return (
                          <div key={phase.id} className="flex items-center">
                            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                              {/* Circle */}
                              <div
                                className={cn(
                                  "rounded-full flex items-center justify-center transition-all",
                                  isCompleted && "w-7 h-7 bg-green-500",
                                  isCurrent && cn("w-9 h-9", phase.color),
                                  isFuture && "w-7 h-7 border-2 border-muted-foreground/30 bg-transparent"
                                )}
                              >
                                {isCompleted && (
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                )}
                                {isCurrent && (
                                  <Zap className="h-4 w-4 text-white" />
                                )}
                              </div>
                              {/* Label */}
                              <span
                                className={cn(
                                  "text-[11px] leading-tight text-center whitespace-nowrap",
                                  isCompleted && "text-green-600 dark:text-green-400 font-medium",
                                  isCurrent && cn("font-bold", phase.textColor),
                                  isFuture && "text-muted-foreground"
                                )}
                              >
                                {phase.label}
                              </span>
                            </div>

                            {/* Connector line */}
                            {idx < entity.phases.length - 1 && (
                              <div
                                className={cn(
                                  "h-0.5 w-6 mx-0.5 mt-[-18px]",
                                  idx < entity.currentIdx
                                    ? "bg-green-500"
                                    : "bg-muted-foreground/20"
                                )}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Next actions preview */}
                {entity.nextPhase && entity.nextActions.length > 0 && (
                  <div
                    className={cn(
                      "mt-4 pl-4 border-l-4 py-3 pr-3 rounded-r-lg bg-muted/30",
                      entity.nextPhase.color.replace("bg-", "border-")
                    )}
                  >
                    <p className="text-xs text-muted-foreground mb-2">
                      Si avanzas a{" "}
                      <span className={cn("font-bold", entity.nextPhase.textColor)}>
                        {entity.nextPhase.label}
                      </span>
                      , se activarán:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleActions.map((action: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[11px] h-6 font-normal max-w-[240px] truncate">
                          {action}
                        </Badge>
                      ))}
                      {extraActions > 0 && (
                        <Badge variant="outline" className="text-[11px] h-6 font-normal">
                          +{extraActions} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
