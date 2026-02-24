import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, ExternalLink, Unlink, FileText, Image, File, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFileLinks } from "@/hooks/useFileLinks";

interface LinkedResourcesSectionProps {
  projectId: string;
}

export function LinkedResourcesSection({ projectId }: LinkedResourcesSectionProps) {
  const { linkedFiles, isLoading, unlinkFile, isLinking } = useFileLinks(projectId);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-5 w-5" />;
    if (fileType.startsWith("image/")) return <Image className="h-5 w-5 text-purple-500" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const handleUnlink = async () => {
    if (unlinkingId) {
      await unlinkFile(unlinkingId);
      setUnlinkingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (linkedFiles.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recursos Vinculados</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {linkedFiles.length} archivo{linkedFiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Archivos vinculados desde carpetas de archivo</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {linkedFiles.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
              >
                {getFileIcon(link.source_file?.file_type || null)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {link.source_file?.file_name || "Archivo no disponible"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      <Link className="h-3 w-3 mr-1" />
                      Vinculado
                    </Badge>
                    {link.source_file?.folder_type && <span>de {link.source_file.folder_type}</span>}
                    {link.linked_at && <span>• {format(new Date(link.linked_at), "d MMM yyyy", { locale: es })}</span>}
                  </div>
                  {link.notes && <p className="text-xs text-muted-foreground mt-1 italic">{link.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {link.source_file?.file_url && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(link.source_file?.file_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={link.source_file.file_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setUnlinkingId(link.id)}
                    disabled={isLinking}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo seguirá disponible en su carpeta original, pero ya no será accesible desde este proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Desvincular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useEffect } from "react";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg: "#0D0F14",
  panel: "#141720",
  card: "#1C2030",
  border: "#252A3A",
  borderL: "#2E3548",
  text: "#E8EAF0",
  muted: "#6B7280",
  dim: "#4B5563",
  green: "#22C55E",
  greenD: "#166534",
  greenL: "#BBF7D0",
  blue: "#3B82F6",
  blueL: "#BFDBFE",
  amber: "#F59E0B",
  amberL: "#FDE68A",
  red: "#EF4444",
  redL: "#FECACA",
  purple: "#A855F7",
  purpleL: "#E9D5FF",
  pink: "#EC4899",
};

// ─── WORKFLOW ENGINE ──────────────────────────────────────────────────────────
// Transición de estado → lista de acciones que se activan automáticamente
const WORKFLOW_TRIGGERS = {
  "show:Interés→Negociación": {
    titulo: "Show entra en negociación",
    icono: "🤝",
    acciones: [
      { txt: "Enviar disponibilidad de fechas al promotor", resp: "Booking", plazo: "24h", prio: "alta" },
      { txt: "Compartir rider técnico y hospitalidad", resp: "Producción", plazo: "48h", prio: "alta" },
      { txt: "Solicitar condiciones económicas (caché, split)", resp: "Management", plazo: "48h", prio: "alta" },
      { txt: "Confirmar aforo y tipo de sala", resp: "Booking", plazo: "48h", prio: "media" },
    ],
  },
  "show:Negociación→Confirmado": {
    titulo: "Show confirmado 🎉",
    icono: "✅",
    acciones: [
      { txt: "Solicitar contrato firmado al promotor", resp: "Management", plazo: "72h", prio: "crítica" },
      { txt: "Facturar anticipo del 50% del caché", resp: "Admin", plazo: "72h", prio: "crítica" },
      { txt: "Añadir al plan de PR y comunicación", resp: "PR/Marketing", plazo: "1 sem", prio: "alta" },
      { txt: "Briefing de producción: backline, PA, luces", resp: "Producción", plazo: "2 sem", prio: "alta" },
      { txt: "Gestionar alojamiento y transporte", resp: "Tour Manager", plazo: "2 sem", prio: "media" },
      { txt: "Publicar en RRSS y añadir a la web", resp: "PR/Marketing", plazo: "1 sem", prio: "media" },
    ],
  },
  "release:En producción→Lanzado": {
    titulo: "Release publicado",
    icono: "💿",
    acciones: [
      { txt: "Pitch a listas editoriales de Spotify/Apple", resp: "Distribución", plazo: "Inmediato", prio: "crítica" },
      { txt: "Enviar a medios y blogs especializados", resp: "PR", plazo: "Inmediato", prio: "alta" },
      { txt: "Publicar en todas las RRSS del artista", resp: "PR/Marketing", plazo: "Inmediato", prio: "alta" },
      { txt: "Notificar a la lista de email/fans", resp: "Management", plazo: "24h", prio: "media" },
      { txt: "Registrar en SGAE/CEDRO si no está hecho", resp: "Admin", plazo: "1 sem", prio: "alta" },
    ],
  },
  "sync:Interés→Negociación": {
    titulo: "Sincronización entra en negociación",
    icono: "🎬",
    acciones: [
      { txt: "Confirmar uso: territorio, duración, exclusividad", resp: "Management", plazo: "48h", prio: "crítica" },
      { txt: "Revisar quién posee el máster y la composición", resp: "Admin/Legal", plazo: "24h", prio: "crítica" },
      { txt: "Preparar propuesta de tarifa (MFN/buyout/royalty)", resp: "Management", plazo: "3 días", prio: "alta" },
      { txt: "Consultar con el artista si acepta el uso", resp: "Management", plazo: "24h", prio: "alta" },
    ],
  },
  "sync:Negociación→Confirmado": {
    titulo: "Sync confirmada 💰",
    icono: "🎬",
    acciones: [
      { txt: "Redactar y firmar contrato de licencia de sync", resp: "Legal", plazo: "5 días", prio: "crítica" },
      { txt: "Facturar el importe acordado", resp: "Admin", plazo: "5 días", prio: "crítica" },
      {
        txt: "Entregar stems y máster en el formato solicitado",
        resp: "Producción",
        plazo: "Según contrato",
        prio: "alta",
      },
      { txt: "Comunicar a SGAE/entidad de gestión el uso", resp: "Admin", plazo: "1 mes", prio: "media" },
    ],
  },
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ESTADOS_SHOW = ["Interés", "Negociación", "Confirmado", "Completado", "Cancelado"];
const ESTADOS_RELEASE = ["En desarrollo", "En producción", "En revisión", "Lanzado"];
const ESTADOS_SYNC = ["Interés", "Negociación", "Confirmado", "Completado", "Caído"];

const INIT_ENTIDADES = [
  {
    id: 1,
    tipo: "show",
    titulo: "La Nau — Barcelona",
    fecha: "19 Feb",
    estado: "Confirmado",
    valor: 3500,
    modulo: "Booking",
    estados: ESTADOS_SHOW,
  },
  {
    id: 2,
    tipo: "show",
    titulo: "Sala El Sol — Madrid",
    fecha: "27 Mar",
    estado: "Confirmado",
    valor: 2800,
    modulo: "Booking",
    estados: ESTADOS_SHOW,
  },
  {
    id: 3,
    tipo: "show",
    titulo: "Inverfest — Madrid",
    fecha: "26 Abr",
    estado: "Negociación",
    valor: null,
    modulo: "Booking",
    estados: ESTADOS_SHOW,
  },
  {
    id: 4,
    tipo: "show",
    titulo: "Razzmatazz — Barcelona",
    fecha: "15 Jun",
    estado: "Interés",
    valor: null,
    modulo: "Booking",
    estados: ESTADOS_SHOW,
  },
  {
    id: 5,
    tipo: "release",
    titulo: "Deriva (Álbum)",
    fecha: "Mar 26",
    estado: "En producción",
    valor: null,
    modulo: "Discografía",
    estados: ESTADOS_RELEASE,
  },
  {
    id: 6,
    tipo: "release",
    titulo: "Tormenta (Single)",
    fecha: "Ene 26",
    estado: "Lanzado",
    valor: null,
    modulo: "Discografía",
    estados: ESTADOS_RELEASE,
  },
  {
    id: 7,
    tipo: "sync",
    titulo: "Spot Estrella Damm",
    fecha: "Mar 26",
    estado: "Negociación",
    valor: 12000,
    modulo: "Sincronizaciones",
    estados: ESTADOS_SYNC,
  },
];

const INIT_TAREAS = [
  {
    id: 1,
    grupo: "PREPARATIVOS",
    txt: "Contrato firmado — La Nau BCN",
    resp: "Management",
    fecha: "1 Feb",
    estado: "ok",
    entidad: 1,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 2,
    grupo: "PREPARATIVOS",
    txt: "Rider técnico enviado — La Nau BCN",
    resp: "Producción",
    fecha: "1 Feb",
    estado: "ok",
    entidad: 1,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 3,
    grupo: "PREPARATIVOS",
    txt: "Anticipo 50% cobrado — La Nau BCN",
    resp: "Admin",
    fecha: "1 Feb",
    estado: "ok",
    entidad: 1,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 4,
    grupo: "PREPARATIVOS",
    txt: "Contrato firmado — El Sol Madrid",
    resp: "Management",
    fecha: "10 Feb",
    estado: "ok",
    entidad: 2,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 5,
    grupo: "PREPARATIVOS",
    txt: "Anticipo 50% cobrado — El Sol Madrid",
    resp: "Admin",
    fecha: "10 Feb",
    estado: "ok",
    entidad: 2,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 6,
    grupo: "PRODUCCIÓN",
    txt: "Rider técnico enviado — El Sol Madrid",
    resp: "Producción",
    fecha: "15 Feb",
    estado: "pending",
    entidad: 2,
    urgente: true,
    bloqueada: false,
  },
  {
    id: 7,
    grupo: "PRODUCCIÓN",
    txt: "Stems máster entregados — Estrella Damm",
    resp: "Producción",
    fecha: "20 Feb",
    estado: "pending",
    entidad: 7,
    urgente: true,
    bloqueada: true,
  },
  {
    id: 8,
    grupo: "PRODUCCIÓN",
    txt: "Registrar 'Tormenta' en SGAE",
    resp: "Admin",
    fecha: "28 Feb",
    estado: "pending",
    entidad: 6,
    urgente: false,
    bloqueada: false,
  },
  {
    id: 9,
    grupo: "PRODUCCIÓN",
    txt: "Pitch editorial Spotify — Álbum 'Deriva'",
    resp: "Distribución",
    fecha: "Mar 1",
    estado: "pending",
    entidad: 5,
    urgente: false,
    bloqueada: true,
  },
  {
    id: 10,
    grupo: "CIERRE",
    txt: "Factura liquidación — La Nau BCN",
    resp: "Admin",
    fecha: "Post",
    estado: "pending",
    entidad: 1,
    urgente: false,
    bloqueada: false,
  },
];

const INIT_IMPREVISTOS = [
  {
    id: 1,
    titulo: "Promotor de Inverfest retrasa la confirmación",
    descripcion:
      "Han pedido una semana más para confirmar. Hay otro artista con quien están negociando la misma fecha. Necesitamos decidir si damos un deadline o esperamos.",
    impacto: "alto",
    estado: "abierto",
    fecha: "22 Feb",
    resp: "Management",
    entidad: 3,
    acciones_posibles: [
      "Dar deadline de 72h para confirmar o liberar la fecha",
      "Ofrecer fecha alternativa en mayo",
      "Contactar con otros promotores de Madrid para esa semana",
    ],
  },
  {
    id: 2,
    titulo: "Estrella Damm quiere exclusividad territorial ampliada",
    descripcion:
      "En la negociación del sync han pedido exclusividad para toda Europa, no solo España. Eso bloquea otras posibles sincronizaciones de la misma canción durante 2 años.",
    impacto: "crítico",
    estado: "en_resolución",
    fecha: "20 Feb",
    resp: "Management/Legal",
    entidad: 7,
    acciones_posibles: [
      "Negociar reducir la exclusividad a España + Portugal",
      "Pedir compensación económica por la exclusividad ampliada",
      "Consultar con el artista si acepta las condiciones",
    ],
  },
];

const INIT_DUDAS = [
  {
    id: 1,
    pregunta: "¿El promotor de Inverfest incluye alojamiento en el contrato o es aparte?",
    dirigida: "Promotor",
    estado: "pendiente",
    fecha: "20 Feb",
    resp: "Booking",
    entidad: 3,
    urgente: true,
  },
  {
    id: 2,
    pregunta: "¿El sync de Estrella Damm incluye derechos de videoclip o solo canción?",
    dirigida: "Damm/Legal",
    estado: "pendiente",
    fecha: "21 Feb",
    resp: "Management",
    entidad: 7,
    urgente: true,
  },
  {
    id: 3,
    pregunta: "¿Razzmatazz tiene fecha disponible para julio también?",
    dirigida: "Sala",
    estado: "pendiente",
    fecha: "18 Feb",
    resp: "Booking",
    entidad: 4,
    urgente: false,
  },
  {
    id: 4,
    pregunta: "¿Los stems del single 'Tormenta' están en el servidor o en el disco duro del estudio?",
    dirigida: "Artista",
    estado: "respondida",
    fecha: "15 Feb",
    resp: "Producción",
    entidad: 6,
    urgente: false,
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const TIPO_META = {
  show: { icon: "🎤", label: "Show", c: T.green, bg: "rgba(34,197,94,.12)" },
  release: { icon: "💿", label: "Release", c: T.purple, bg: "rgba(168,85,247,.12)" },
  sync: { icon: "🎬", label: "Sync", c: T.blue, bg: "rgba(59,130,246,.12)" },
  video: { icon: "🎥", label: "Videoclip", c: T.amber, bg: "rgba(245,158,11,.12)" },
};

const IMPACTO = {
  bajo: { c: T.muted, bg: "rgba(107,114,128,.15)", label: "Bajo" },
  medio: { c: T.amber, bg: "rgba(245,158,11,.15)", label: "Medio" },
  alto: { c: T.red, bg: "rgba(239,68,68,.15)", label: "Alto" },
  crítico: { c: "#FF3B30", bg: "rgba(255,59,48,.2)", label: "Crítico" },
};

const PRIO_COLOR = { crítica: T.red, alta: T.amber, media: T.blue };

const estadoColor = (e) => {
  if (["Confirmado", "Completado", "Lanzado", "ok"].includes(e)) return { c: T.green, bg: "rgba(34,197,94,.12)" };
  if (["Negociación", "En producción", "En revisión", "en_resolución"].includes(e))
    return { c: T.amber, bg: "rgba(245,158,11,.12)" };
  if (["Interés", "pending", "En desarrollo"].includes(e)) return { c: T.blue, bg: "rgba(59,130,246,.12)" };
  if (["Cancelado", "Caído", "abierto"].includes(e)) return { c: T.red, bg: "rgba(239,68,68,.12)" };
  return { c: T.muted, bg: "rgba(107,114,128,.12)" };
};

const estadoLabel = (e) =>
  ({
    ok: "Completada",
    pending: "Pendiente",
    abierto: "Abierto",
    en_resolución: "En resolución",
    respondida: "Respondida",
  })[e] || e;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Chip = ({ text, s }) => {
  const st = s || estadoColor(text);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: st.c,
        background: st.bg,
        padding: "2px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
        letterSpacing: ".2px",
      }}
    >
      {estadoLabel(text)}
    </span>
  );
};

const PrioChip = ({ p }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 800,
      color: PRIO_COLOR[p] || T.muted,
      background: `${PRIO_COLOR[p] || T.muted}22`,
      padding: "1px 7px",
      borderRadius: 20,
      letterSpacing: ".5px",
      textTransform: "uppercase",
    }}
  >
    {p}
  </span>
);

const Btn = ({ children, onClick, v = "ghost", small, style = {} }) => {
  const styles = {
    primary: { background: T.green, color: "#000", border: "none" },
    outline: { background: "transparent", color: T.green, border: `1px solid ${T.green}44` },
    ghost: { background: T.card, color: T.text, border: `1px solid ${T.border}` },
    danger: { background: "transparent", color: T.red, border: `1px solid ${T.red}44` },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[v],
        cursor: "pointer",
        borderRadius: 7,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: small ? "4px 10px" : "7px 14px",
        fontSize: small ? 11 : 12,
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Card = ({ children, s = {}, glow }) => (
  <div
    style={{
      background: T.card,
      border: `1px solid ${glow ? T.green + "44" : T.border}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: glow ? `0 0 0 1px ${T.green}22, 0 4px 20px ${T.green}11` : "none",
      ...s,
    }}
  >
    {children}
  </div>
);

const Sec = ({ label, count, color }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 800,
      color: color || T.muted,
      textTransform: "uppercase",
      letterSpacing: "1.2px",
      marginBottom: 10,
      display: "flex",
      gap: 8,
      alignItems: "center",
    }}
  >
    {label}
    {count !== undefined && (
      <span
        style={{
          background: T.border,
          padding: "1px 6px",
          borderRadius: 8,
          fontSize: 10,
          color: T.muted,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    )}
  </div>
);

// ─── WORKFLOW TOAST ────────────────────────────────────────────────────────────
function WorkflowToast({ trigger, onClose }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const def = WORKFLOW_TRIGGERS[trigger];
  if (!def) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 420,
        background: T.panel,
        border: `1px solid ${T.green}55`,
        borderRadius: 16,
        padding: 20,
        zIndex: 200,
        boxShadow: `0 8px 40px rgba(0,0,0,.6), 0 0 0 1px ${T.green}22`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16 }}>{def.icono}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 4 }}>{def.titulo}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            Se han activado {def.acciones.length} acciones automáticamente
          </div>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {def.acciones.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              padding: "7px 10px",
              background: T.bg,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: PRIO_COLOR[a.prio] || T.muted,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.text }}>{a.txt}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                {a.resp} · {a.plazo}
              </div>
            </div>
            <PrioChip p={a.prio} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn
          v="primary"
          small
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        >
          Añadir al checklist
        </Btn>
        <Btn
          small
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        >
          Ignorar
        </Btn>
      </div>
    </div>
  );
}

// ─── PULSO (DASHBOARD) ────────────────────────────────────────────────────────
function Pulso({ entidades, tareas, imprevistos, dudas }) {
  const pendientes = tareas.filter((t) => t.estado === "pending");
  const urgentes = tareas.filter((t) => t.urgente && t.estado === "pending");
  const bloqueadas = tareas.filter((t) => t.bloqueada && t.estado === "pending");
  const impCriticos = imprevistos.filter((i) => i.estado !== "resuelto");
  const dudasPend = dudas.filter((d) => d.estado === "pendiente");
  const feeConf = entidades
    .filter((e) => e.tipo === "show" && e.estado === "Confirmado")
    .reduce((a, e) => a + (e.valor || 0), 0);
  const syncPot = entidades.filter((e) => e.tipo === "sync").reduce((a, e) => a + (e.valor || 0), 0);

  // Health score
  const score = Math.max(
    0,
    100 -
      urgentes.length * 15 -
      impCriticos.filter((i) => i.impacto === "crítico").length * 20 -
      dudasPend.filter((d) => d.urgente).length * 10,
  );
  const scoreColor = score >= 70 ? T.green : score >= 40 ? T.amber : T.red;

  const proximas = [
    ...tareas.filter((t) => t.estado === "pending" && t.urgente),
    ...tareas.filter((t) => t.estado === "pending" && !t.urgente && !t.bloqueada),
  ].slice(0, 5);

  return (
    <div>
      {/* Fila top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          {
            label: "Salud del proyecto",
            val: `${score}%`,
            icon: "💚",
            c: scoreColor,
            sub: score >= 70 ? "En buen estado" : "Necesita atención",
          },
          {
            label: "Tareas urgentes",
            val: urgentes.length,
            icon: "🔥",
            c: urgentes.length > 0 ? T.red : T.green,
            sub: `de ${pendientes.length} pendientes`,
          },
          {
            label: "Tareas bloqueadas",
            val: bloqueadas.length,
            icon: "🚧",
            c: bloqueadas.length > 0 ? T.amber : T.green,
            sub: "esperando otra acción",
          },
          {
            label: "Imprevistos abiertos",
            val: impCriticos.length,
            icon: "⚡",
            c: impCriticos.length > 0 ? T.red : T.green,
            sub: `${impCriticos.filter((i) => i.impacto === "crítico").length} críticos`,
          },
          {
            label: "Dudas sin respuesta",
            val: dudasPend.length,
            icon: "❓",
            c: dudasPend.length > 0 ? T.amber : T.green,
            sub: `${dudasPend.filter((d) => d.urgente).length} urgentes`,
          },
        ].map((k) => (
          <Card key={k.label} s={{ padding: 14 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: k.c, fontVariantNumeric: "tabular-nums" }}>{k.val}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginTop: 2 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Próximas acciones */}
        <div>
          <Card>
            <Sec label="Próximas acciones" count={pendientes.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {proximas.map((t) => {
                const ent = entidades.find((e) => e.id === t.entidad);
                const meta = ent ? TIPO_META[ent.tipo] : null;
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "9px 10px",
                      background: T.bg,
                      borderRadius: 8,
                      border: `1px solid ${t.urgente ? T.red + "33" : T.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: t.urgente ? T.red : T.blue,
                        marginTop: 4,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>{t.txt}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {meta && (
                          <span
                            style={{
                              fontSize: 10,
                              color: meta.c,
                              background: meta.bg,
                              padding: "1px 6px",
                              borderRadius: 8,
                            }}
                          >
                            {meta.icon} {ent.titulo}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: T.muted }}>{t.resp}</span>
                        {t.urgente && <span style={{ fontSize: 10, fontWeight: 800, color: T.red }}>URGENTE</span>}
                        {t.bloqueada && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: T.amber }}>⚠ BLOQUEADA</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: T.dim, whiteSpace: "nowrap" }}>{t.fecha}</span>
                  </div>
                );
              })}
              {pendientes.length > 5 && (
                <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: 6 }}>
                  +{pendientes.length - 5} tareas más en Checklist
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Imprevistos + Dudas resumen */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <Sec
              label="Imprevistos activos"
              count={impCriticos.length}
              color={impCriticos.length > 0 ? T.red : T.muted}
            />
            {impCriticos.length === 0 ? (
              <div style={{ fontSize: 12, color: T.muted, padding: "12px 0" }}>Sin imprevistos activos ✓</div>
            ) : (
              impCriticos.map((imp) => (
                <div
                  key={imp.id}
                  style={{
                    padding: "10px 12px",
                    background: T.bg,
                    borderRadius: 8,
                    border: `1px solid ${IMPACTO[imp.impacto].c}33`,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, flex: 1, marginRight: 8 }}>
                      {imp.titulo}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: IMPACTO[imp.impacto].c,
                        background: IMPACTO[imp.impacto].bg,
                        padding: "1px 7px",
                        borderRadius: 10,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {IMPACTO[imp.impacto].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{imp.descripcion.slice(0, 100)}…</div>
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>
                    {imp.resp} · {imp.fecha}
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <Sec
              label="Dudas sin respuesta"
              count={dudasPend.length}
              color={dudasPend.length > 0 ? T.amber : T.muted}
            />
            {dudasPend.length === 0 ? (
              <div style={{ fontSize: 12, color: T.muted, padding: "12px 0" }}>Sin dudas pendientes ✓</div>
            ) : (
              dudasPend.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "9px 10px",
                    background: T.bg,
                    borderRadius: 8,
                    border: `1px solid ${d.urgente ? T.amber + "44" : T.border}`,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4, marginBottom: 3 }}>{d.pregunta}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 10, color: T.muted }}>→ {d.dirigida}</span>
                    {d.urgente && <span style={{ fontSize: 10, fontWeight: 700, color: T.amber }}>Urgente</span>}
                  </div>
                </div>
              ))
            )}
            {dudasPend.length > 3 && (
              <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: 4 }}>
                +{dudasPend.length - 3} dudas más
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Economía del proyecto */}
      <Card s={{ marginTop: 14 }}>
        <Sec label="Resumen económico en tiempo real" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {[
            {
              label: "Fee confirmado",
              val: `${feeConf.toLocaleString()}€`,
              c: T.green,
              sub: `${entidades.filter((e) => e.tipo === "show" && e.estado === "Confirmado").length} shows`,
            },
            {
              label: "Syncs en negociación",
              val: `${syncPot.toLocaleString()}€`,
              c: T.amber,
              sub: "potencial, no confirmado",
            },
            {
              label: "En negociación",
              val: `${entidades
                .filter((e) => e.estado === "Negociación" && e.valor)
                .reduce((a, e) => a + (e.valor || 0), 0)
                .toLocaleString()}€`,
              c: T.blue,
              sub: "total en negociación",
            },
            { label: "Cobrado vs. pendiente", val: "50%", c: T.purple, sub: "de los confirmados facturado" },
          ].map((k) => (
            <div
              key={k.label}
              style={{ padding: "12px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}
            >
              <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.val}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginTop: 2 }}>{k.label}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── WORKFLOWS TAB ────────────────────────────────────────────────────────────
function WorkflowsTab({ entidades, onTrigger }) {
  return (
    <div>
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(59,130,246,.08)",
          border: `1px solid ${T.blue}33`,
          borderRadius: 10,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: T.blueL, marginBottom: 4 }}>⚡ Motor de workflows</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Cuando cambias el estado de una entidad, el sistema detecta la transición y activa automáticamente las tareas
          que corresponden según el workflow de la industria musical. Pruébalo: cambia el estado de cualquier entidad
          abajo.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entidades.map((ent) => {
          const meta = TIPO_META[ent.tipo] || TIPO_META.show;
          const idx = ent.estados.indexOf(ent.estado);
          return (
            <Card key={ent.id} s={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{ent.titulo}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {meta.label} · {ent.fecha} · {ent.modulo}
                  </div>
                </div>

                {/* Estado selector visual */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {ent.estados.map((st, i) => {
                    const isCurrent = i === idx;
                    const isPast = i < idx;
                    const stC = estadoColor(st);
                    return (
                      <button
                        key={st}
                        onClick={() => onTrigger(ent.id, st)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px 6px",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: isCurrent ? stC.c : isPast ? "rgba(34,197,94,.15)" : "transparent",
                            border: `2px solid ${isCurrent ? stC.c : isPast ? T.green + "55" : T.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isPast && <span style={{ color: T.green, fontSize: 12, fontWeight: 900 }}>✓</span>}
                          {isCurrent && (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#000" }} />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            color: isCurrent ? stC.c : isPast ? T.green : T.dim,
                            fontWeight: isCurrent ? 700 : 400,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {st}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Muestra qué trigger tiene disponible */}
              {(() => {
                const nextState = ent.estados[idx + 1];
                const triggerKey = `${ent.tipo}:${ent.estado}→${nextState}`;
                const def = WORKFLOW_TRIGGERS[triggerKey];
                if (!def) return null;
                return (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "rgba(34,197,94,.06)",
                      border: `1px solid ${T.green}22`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>
                      Si avanzas a <strong style={{ color: T.green }}>{nextState}</strong>, se activarán:
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {def.acciones.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          style={{ fontSize: 10, color: T.dim, background: T.bg, padding: "2px 8px", borderRadius: 6 }}
                        >
                          {a.txt.slice(0, 40)}…
                        </span>
                      ))}
                      {def.acciones.length > 3 && (
                        <span style={{ fontSize: 10, color: T.muted }}>+{def.acciones.length - 3} más</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── IMPREVISTOS TAB ──────────────────────────────────────────────────────────
function ImprevistosTab({ imprevistos, setImprevistos, entidades }) {
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ titulo: "", desc: "", impacto: "medio", resp: "", entidadId: "" });

  const abiertos = imprevistos.filter((i) => i.estado === "abierto");
  const enResol = imprevistos.filter((i) => i.estado === "en_resolución");
  const resueltos = imprevistos.filter((i) => i.estado === "resuelto");

  const cambiarEstado = (id, nuevoEstado) => {
    setImprevistos((prev) => prev.map((i) => (i.id === id ? { ...i, estado: nuevoEstado } : i)));
  };

  const ImpCard = ({ imp }) => {
    const ent = entidades.find((e) => e.id === imp.entidad);
    const meta = ent ? TIPO_META[ent.tipo] : null;
    return (
      <Card key={imp.id} s={{ marginBottom: 10, borderLeft: `3px solid ${IMPACTO[imp.impacto].c}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1, marginRight: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{imp.titulo}</div>
            {ent && (
              <span style={{ fontSize: 10, color: meta.c, background: meta.bg, padding: "1px 6px", borderRadius: 8 }}>
                {meta.icon} {ent.titulo}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: IMPACTO[imp.impacto].c,
                background: IMPACTO[imp.impacto].bg,
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              {IMPACTO[imp.impacto].label}
            </span>
            <Chip text={imp.estado} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.65, marginBottom: 10 }}>{imp.descripcion}</div>
        {imp.acciones_posibles && (
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.dim,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: ".8px",
              }}
            >
              Opciones de resolución
            </div>
            {imp.acciones_posibles.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0" }}>
                <span style={{ color: T.blue, fontSize: 12, marginTop: 1, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12, color: T.text }}>{a}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: T.dim }}>
            {imp.resp} · {imp.fecha}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {imp.estado === "abierto" && (
              <Btn small v="outline" onClick={() => cambiarEstado(imp.id, "en_resolución")}>
                Marcar en resolución
              </Btn>
            )}
            {imp.estado === "en_resolución" && (
              <Btn small v="primary" onClick={() => cambiarEstado(imp.id, "resuelto")}>
                ✓ Marcar resuelto
              </Btn>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Abiertos", c: T.red, n: abiertos.length },
            { label: "En resolución", c: T.amber, n: enResol.length },
            { label: "Resueltos", c: T.green, n: resueltos.length },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
              <span style={{ fontSize: 12, color: T.muted }}>
                {s.label}: <strong style={{ color: T.text }}>{s.n}</strong>
              </span>
            </div>
          ))}
        </div>
        <Btn v="outline" onClick={() => setNuevo(true)}>
          + Registrar imprevisto
        </Btn>
      </div>

      {nuevo && (
        <Card s={{ marginBottom: 16, border: `1px solid ${T.red}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Nuevo imprevisto</div>
          <input
            placeholder="Título del imprevisto"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            style={{
              width: "100%",
              padding: "9px 12px",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              fontSize: 13,
              marginBottom: 8,
              boxSizing: "border-box",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <textarea
            placeholder="Descripción detallada del imprevisto y su impacto…"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            style={{
              width: "100%",
              padding: "9px 12px",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              fontSize: 13,
              marginBottom: 8,
              boxSizing: "border-box",
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 80,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select
              value={form.impacto}
              onChange={(e) => setForm({ ...form, impacto: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              {["bajo", "medio", "alto", "crítico"].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
            <input
              placeholder="Responsable"
              value={form.resp}
              onChange={(e) => setForm({ ...form, resp: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              v="primary"
              small
              onClick={() => {
                if (!form.titulo) return;
                setImprevistos((prev) => [
                  {
                    id: Date.now(),
                    titulo: form.titulo,
                    descripcion: form.desc,
                    impacto: form.impacto,
                    estado: "abierto",
                    fecha: "Ahora",
                    resp: form.resp,
                    acciones_posibles: [],
                  },
                  ...prev,
                ]);
                setForm({ titulo: "", desc: "", impacto: "medio", resp: "", entidadId: "" });
                setNuevo(false);
              }}
            >
              Registrar imprevisto
            </Btn>
            <Btn small onClick={() => setNuevo(false)}>
              Cancelar
            </Btn>
          </div>
        </Card>
      )}

      {abiertos.length > 0 && (
        <>
          <Sec label="Abiertos" color={T.red} />
          {abiertos.map((i) => (
            <ImpCard key={i.id} imp={i} />
          ))}
        </>
      )}
      {enResol.length > 0 && (
        <>
          <Sec label="En resolución" color={T.amber} />
          {enResol.map((i) => (
            <ImpCard key={i.id} imp={i} />
          ))}
        </>
      )}
      {resueltos.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11, color: T.dim, cursor: "pointer", padding: "6px 0" }}>
            Mostrar {resueltos.length} resueltos
          </summary>
          {resueltos.map((i) => (
            <ImpCard key={i.id} imp={i} />
          ))}
        </details>
      )}
      {imprevistos.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>
          Sin imprevistos registrados ✓
        </div>
      )}
    </div>
  );
}

// ─── DUDAS TAB ────────────────────────────────────────────────────────────────
function DudasTab({ dudas, setDudas, entidades }) {
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ pregunta: "", dirigida: "", resp: "", urgente: false });

  const pendientes = dudas.filter((d) => d.estado === "pendiente");
  const respondidas = dudas.filter((d) => d.estado === "respondida");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
        <div style={{ fontSize: 13, color: T.muted }}>
          <strong style={{ color: T.amber }}>{pendientes.filter((d) => d.urgente).length}</strong> urgentes ·{" "}
          <strong style={{ color: T.text }}>{pendientes.length}</strong> sin respuesta ·{" "}
          <strong style={{ color: T.green }}>{respondidas.length}</strong> respondidas
        </div>
        <Btn v="outline" onClick={() => setNuevo(true)}>
          + Añadir duda
        </Btn>
      </div>

      {nuevo && (
        <Card s={{ marginBottom: 16, border: `1px solid ${T.amber}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Nueva duda</div>
          <textarea
            placeholder="¿Cuál es la duda o pregunta que necesita respuesta?"
            value={form.pregunta}
            onChange={(e) => setForm({ ...form, pregunta: e.target.value })}
            style={{
              width: "100%",
              padding: "9px 12px",
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              fontSize: 13,
              marginBottom: 8,
              boxSizing: "border-box",
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 70,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Dirigida a (promotor, sello, artista…)"
              value={form.dirigida}
              onChange={(e) => setForm({ ...form, dirigida: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <input
              placeholder="Responsable de preguntar"
              value={form.resp}
              onChange={(e) => setForm({ ...form, resp: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label
              style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: T.text, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={form.urgente}
                onChange={(e) => setForm({ ...form, urgente: e.target.checked })}
                style={{ accentColor: T.amber }}
              />
              Es urgente (bloquea una decisión)
            </label>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Btn
                v="primary"
                small
                onClick={() => {
                  if (!form.pregunta) return;
                  setDudas((prev) => [
                    {
                      id: Date.now(),
                      pregunta: form.pregunta,
                      dirigida: form.dirigida,
                      resp: form.resp,
                      urgente: form.urgente,
                      estado: "pendiente",
                      fecha: "Ahora",
                      entidad: null,
                    },
                    ...prev,
                  ]);
                  setForm({ pregunta: "", dirigida: "", resp: "", urgente: false });
                  setNuevo(false);
                }}
              >
                Añadir duda
              </Btn>
              <Btn small onClick={() => setNuevo(false)}>
                Cancelar
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {pendientes.length > 0 && (
        <>
          <Sec label="Sin respuesta" count={pendientes.length} color={T.amber} />
          {pendientes
            .sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0))
            .map((d) => {
              const ent = entidades.find((e) => e.id === d.entidad);
              const meta = ent ? TIPO_META[ent.tipo] : null;
              return (
                <Card key={d.id} s={{ marginBottom: 8, borderLeft: `3px solid ${d.urgente ? T.amber : T.border}` }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: d.urgente ? "rgba(245,158,11,.2)" : "rgba(59,130,246,.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {d.urgente ? "❓" : "💬"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 5 }}>{d.pregunta}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {ent && (
                          <span
                            style={{
                              fontSize: 10,
                              color: meta.c,
                              background: meta.bg,
                              padding: "1px 6px",
                              borderRadius: 8,
                            }}
                          >
                            {meta.icon} {ent.titulo}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: T.muted }}>→ {d.dirigida}</span>
                        <span style={{ fontSize: 10, color: T.muted }}>Resp: {d.resp}</span>
                        {d.urgente && <span style={{ fontSize: 10, fontWeight: 800, color: T.amber }}>URGENTE</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: T.dim, whiteSpace: "nowrap" }}>{d.fecha}</span>
                      <Btn
                        small
                        v="primary"
                        onClick={() =>
                          setDudas((prev) => prev.map((x) => (x.id === d.id ? { ...x, estado: "respondida" } : x)))
                        }
                      >
                        ✓ Respondida
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
        </>
      )}

      {respondidas.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11, color: T.dim, cursor: "pointer", padding: "6px 0" }}>
            Mostrar {respondidas.length} respondidas
          </summary>
          {respondidas.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "9px 12px",
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                marginBottom: 6,
                opacity: 0.6,
              }}
            >
              <div style={{ fontSize: 12, color: T.text }}>{d.pregunta}</div>
              <div style={{ fontSize: 10, color: T.green, marginTop: 4 }}>✓ Respondida · {d.dirigida}</div>
            </div>
          ))}
        </details>
      )}

      {dudas.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>Sin dudas registradas ✓</div>
      )}
    </div>
  );
}

// ─── CHECKLIST MEJORADO ────────────────────────────────────────────────────────
function ChecklistTab({ tareas, setTareas, entidades }) {
  const todas = tareas;
  const completadas = todas.filter((t) => t.estado === "ok").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ height: 6, width: 200, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(completadas / todas.length) * 100}%`,
                height: "100%",
                background: T.green,
                borderRadius: 4,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>
            {completadas}/{todas.length} completadas
          </span>
        </div>
        <Btn v="outline">+ Añadir tarea</Btn>
      </div>

      {["PREPARATIVOS", "PRODUCCIÓN", "CIERRE"].map((grupo) => {
        const gTareas = tareas.filter((t) => t.grupo === grupo);
        const gComp = gTareas.filter((t) => t.estado === "ok").length;
        return (
          <div
            key={grupo}
            style={{ marginBottom: 12, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}
          >
            <div style={{ padding: "9px 14px", background: T.panel, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.dim, letterSpacing: "1px" }}>{grupo}</span>
              <div style={{ height: 4, flex: 1, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(gComp / gTareas.length) * 100}%`,
                    height: "100%",
                    background: T.green,
                    borderRadius: 2,
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: T.muted }}>
                {gComp}/{gTareas.length}
              </span>
            </div>
            {gTareas.map((t) => {
              const ent = entidades.find((e) => e.id === t.entidad);
              const meta = ent ? TIPO_META[ent.tipo] : null;
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "10px 14px",
                    borderTop: `1px solid ${T.border}`,
                    background: t.bloqueada
                      ? "rgba(245,158,11,.03)"
                      : t.urgente && t.estado !== "ok"
                        ? "rgba(239,68,68,.03)"
                        : "transparent",
                    opacity: t.estado === "ok" ? 0.6 : 1,
                  }}
                >
                  <button
                    onClick={() =>
                      setTareas((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, estado: x.estado === "ok" ? "pending" : "ok" } : x)),
                      )
                    }
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${t.estado === "ok" ? T.green : T.dim}`,
                      background: t.estado === "ok" ? T.green : "transparent",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {t.estado === "ok" && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {t.urgente && t.estado !== "ok" && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: T.red,
                            background: `${T.red}22`,
                            padding: "1px 6px",
                            borderRadius: 5,
                          }}
                        >
                          URGENTE
                        </span>
                      )}
                      {t.bloqueada && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.amber,
                            background: `${T.amber}22`,
                            padding: "1px 6px",
                            borderRadius: 5,
                          }}
                        >
                          ⚠ BLOQUEADA
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 12,
                          color: t.estado === "ok" ? T.muted : T.text,
                          textDecoration: t.estado === "ok" ? "line-through" : "none",
                        }}
                      >
                        {t.txt}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {meta && (
                        <span
                          style={{
                            fontSize: 10,
                            color: meta.c,
                            background: meta.bg,
                            padding: "1px 6px",
                            borderRadius: 8,
                          }}
                        >
                          {meta.icon} {ent?.titulo}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: T.muted }}>{t.resp}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: T.dim, whiteSpace: "nowrap" }}>{t.fecha}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("pulso");
  const [entidades, setEntidades] = useState(INIT_ENTIDADES);
  const [tareas, setTareas] = useState(INIT_TAREAS);
  const [imprevistos, setImprevistos] = useState(INIT_IMPREVISTOS);
  const [dudas, setDudas] = useState(INIT_DUDAS);
  const [trigger, setTrigger] = useState(null);

  const handleTrigger = (entidadId, nuevoEstado) => {
    const ent = entidades.find((e) => e.id === entidadId);
    if (!ent) return;
    const triggerKey = `${ent.tipo}:${ent.estado}→${nuevoEstado}`;
    setEntidades((prev) => prev.map((e) => (e.id === entidadId ? { ...e, estado: nuevoEstado } : e)));
    if (WORKFLOW_TRIGGERS[triggerKey]) setTrigger(triggerKey);
  };

  const urgentes = tareas.filter((t) => t.urgente && t.estado === "pending");
  const imprAb = imprevistos.filter((i) => i.estado !== "resuelto");
  const dudasPend = dudas.filter((d) => d.estado === "pendiente");

  const TABS = [
    {
      id: "pulso",
      label: "Pulso",
      badge:
        urgentes.length + imprAb.filter((i) => i.impacto === "crítico").length > 0
          ? urgentes.length + imprAb.filter((i) => i.impacto === "crítico").length
          : null,
      badgeC: T.red,
    },
    { id: "workflows", label: "⚡ Workflows" },
    { id: "checklist", label: "Checklist", badge: urgentes.length || null, badgeC: T.amber },
    { id: "imprevistos", label: "Imprevistos", badge: imprAb.length || null, badgeC: T.red },
    { id: "dudas", label: "Dudas", badge: dudasPend.filter((d) => d.urgente).length || null, badgeC: T.amber },
    { id: "cronograma", label: "Cronograma" },
    { id: "finanzas", label: "Finanzas" },
    { id: "archivos", label: "Archivos" },
  ];

  return (
    <div
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg, minHeight: "100vh", color: T.text }}
    >
      {trigger && <WorkflowToast trigger={trigger} onClose={() => setTrigger(null)} />}

      {/* Nav */}
      <div style={{ padding: "10px 24px", fontSize: 11, color: T.dim, borderBottom: `1px solid ${T.border}` }}>
        Dashboard → Vic Mirallas → <strong style={{ color: T.muted }}>On TOUR 2026</strong>
      </div>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", background: T.panel, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.5px" }}>
                On TOUR — Gira Nacional 2026
              </h1>
              <Chip text="En progreso" />
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>Vic Mirallas · 29 Dic 2025 → 31 Dic 2026</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="outline">🔗 Vincular</Btn>
            <Btn v="primary">+ Crear</Btn>
          </div>
        </div>

        {/* Progress + alerts inline */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "23%", height: "100%", background: T.green, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>23%</span>
          {urgentes.length > 0 && (
            <span
              style={{
                fontSize: 11,
                background: `${T.red}22`,
                color: T.red,
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => setTab("checklist")}
            >
              🔥 {urgentes.length} urgentes
            </span>
          )}
          {imprAb.length > 0 && (
            <span
              style={{
                fontSize: 11,
                background: `${T.amber}22`,
                color: T.amber,
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => setTab("imprevistos")}
            >
              ⚡ {imprAb.length} imprevistos
            </span>
          )}
          {dudasPend.length > 0 && (
            <span
              style={{
                fontSize: 11,
                background: `${T.blue}22`,
                color: T.blueL,
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => setTab("dudas")}
            >
              ❓ {dudasPend.length} dudas
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? `2px solid ${T.green}` : "2px solid transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? T.green : T.muted,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {t.label}
              {t.badge && (
                <span
                  style={{
                    background: t.badgeC,
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 8,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {tab === "pulso" && <Pulso entidades={entidades} tareas={tareas} imprevistos={imprevistos} dudas={dudas} />}
        {tab === "workflows" && <WorkflowsTab entidades={entidades} onTrigger={handleTrigger} />}
        {tab === "checklist" && <ChecklistTab tareas={tareas} setTareas={setTareas} entidades={entidades} />}
        {tab === "imprevistos" && (
          <ImprevistosTab imprevistos={imprevistos} setImprevistos={setImprevistos} entidades={entidades} />
        )}
        {tab === "dudas" && <DudasTab dudas={dudas} setDudas={setDudas} entidades={entidades} />}
        {tab === "cronograma" && (
          <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Cronograma — ver prototipo V2</div>
        )}
        {tab === "finanzas" && (
          <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Finanzas — ver prototipo V2</div>
        )}
        {tab === "archivos" && (
          <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Archivos — ver prototipo V2</div>
        )}
      </div>
    </div>
  );
}
