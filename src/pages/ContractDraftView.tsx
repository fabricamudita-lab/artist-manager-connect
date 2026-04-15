import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicDraft } from '@/hooks/useContractDrafts';
import { useAuth } from '@/hooks/useAuth';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { DraftCommentsSidebar } from '@/components/contract-drafts/DraftCommentsSidebar';
import { TextSelectionHandler, type TextSelection } from '@/components/contract-drafts/TextSelectionHandler';
import { NegotiationBanner } from '@/components/contract-drafts/NegotiationBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  return `Hace ${Math.floor(hours / 24)} días`;
}

function s(val: string | undefined): string {
  return val?.trim() || '___________';
}

function numberToSpanishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['CERO','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  if (n <= 29) return units[n];
  const tens = ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  if (n === 100) return 'CIEN';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]} Y ${units[u]}`;
}

function resolveClause(text: string, d: any): string {
  const royaltyNum = parseInt(d.royalty_porcentaje) || 0;
  const royaltyText = numberToSpanishText(royaltyNum) || s('');
  return text
    .replace(/\{\{calidad_entidad\}\}/g, s(d.calidad_entidad))
    .replace(/\{\{productora_nombre_artistico\}\}/g, s(d.productora_nombre_artistico))
    .replace(/\{\{royalty_texto\}\}/g, royaltyText)
    .replace(/\{\{royalty_porcentaje\}\}/g, s(d.royalty_porcentaje))
    .replace(/\{\{grabacion_titulo\}\}/g, s(d.grabacion_titulo))
    .replace(/\{\{productora_email\}\}/g, s(d.productora_email))
    .replace(/\{\{colaboradora_email\}\}/g, s(d.colaboradora_email));
}

const DEFAULT_IP_CLAUSES: Record<string, string> = {
  objeto_1_1: '1.1. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesión a terceros todos los derechos de propiedad intelectual que recaen sobre su interpretación musical, fijada en la Grabación que se detalla a continuación:',
  objeto_1_2: '1.2. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesión a terceros todos los derechos que recaen sobre su imagen personal, incluyendo nombre civil o artístico, con propósito de mención e información relacionada con la Grabación, y, en especial los relativos a su imagen personal vinculada a su interpretación en el caso de que exista una grabación audiovisual (en la forma de un videoclip o similar) vinculada a la Grabación.',
  alcance_2_1: '2.1. El alcance de las cesiones de derechos de la COLABORADORA a favor de la PRODUCTORA que son objeto de este contrato, se conceden con la mayor amplitud y de forma ilimitada con la finalidad de que la PRODUCTORA pueda explotar la Grabación, el Sencillo, el videoclip y/o cualquier material promocional, publicitario y/o informativo que acompañe a los mismos, en todos los formatos y sistemas de explotación de música y audiovisuales, a través de todos los medios de explotación que existan durante la vigencia de la presente cesión de derechos y sin más limitaciones que las establecidas en el presente contrato.',
  alcance_2_2: '2.2. La COLABORADORA cede a la PRODUCTORA, a título enunciativo, pero sin carácter limitativo, el derecho de reproducción, distribución, comunicación pública y transformación necesarios para la pacífica explotación de la Grabación y, en su caso, de los audiovisuales que la acompañen, quedando facultada la PRODUCTORA para contratar con terceros la explotación de los mismos, transfiriendo a dichos terceros los mismos derechos y obligaciones que adquiere la PRODUCTORA en este contrato.',
  alcance_2_3: '2.3. La PRODUCTORA se compromete a acreditar a la COLABORADORA de la siguiente forma, siguiendo los usos y costumbres del sector y según las posibilidades de cada uno de los medios y sistemas de explotación de la Grabación, del Sencillo y, en su caso, del videoclip:',
  alcance_2_4: '2.4. Sin perjuicio de la cesión de derechos otorgada en este documento, la COLABORADORA podrá acreditar su participación en las entidades de gestión de derechos de propiedad intelectual de los artistas intérpretes y ejecutantes, con relación a la Grabación y, en su caso, al videoclip, en calidad de ({{calidad_entidad}}).',
  alcance_2_5: '2.5. Queda expresamente acordado que la PRODUCTORA, por sí o por terceros, podrá explotar la Grabación en forma de sencillo discográfico o single; en forma de videoclip incluyendo o no la imagen de la COLABORADORA; en forma de fragmentos para su uso en teasers, trailers, piezas promocionales de la Grabación, el videoclip o la carrera profesional de {{productora_nombre_artistico}}, y, con carácter general, de forma amplia siempre y cuando la interpretación de la COLABORADORA forme parte de la Grabación y no se utilice de forma independiente a esta y esté relacionada con la explotación, publicidad, promoción y/o comunicación de la carrera y productos de {{productora_nombre_artistico}} y/o la PRODUCTORA.',
  contraprestacion_3_1: '3.1. En contraprestación por la cesión de derechos que es objeto de este contrato y como remuneración total por la participación de la COLABORADORA en la Grabación y, en su caso, el videoclip, la PRODUCTORA abonará a la COLABORADORA, por sí o por terceros, un royalty de artista equivalente al {{royalty_texto}} POR CIENTO ({{royalty_porcentaje}}%) de los ingresos que la PRODUCTORA obtenga por la explotación de la Grabación y, en su caso, del videoclip, independientemente de su procedencia.',
  contraprestacion_3_2: '3.2. En el caso de que posteriormente la Grabación se incorpore a un álbum u otra compilación, y los ingresos de la PRODUCTORA provengan de la explotación de dicho álbum o compilación, dichos ingresos serán repartidos entre el número de grabaciones integrantes del mismo para calcular los ingresos correspondientes a la Grabación y abonar el royalty de artista en consecuencia.',
  contraprestacion_3_3: '3.3. La PRODUCTORA será la responsable del pago del royalty de artista a la COLABORADORA, si bien la PRODUCTORA podrá encargar dicho pago a terceros a los que licencie la comercialización y/o distribución de la Grabación, de forma temporal o permanente.',
  contraprestacion_3_4: '3.4. La frecuencia del pago del royalty de artista será semestral, coincidiendo con los pagos que reciba la PRODUCTORA por parte de los terceros a quien licencie la comercialización y/o distribución del Sencillo y la Grabación y no se aplicarán descuentos por parte de la PRODUCTORA.',
  contraprestacion_3_5: '3.5. La PRODUCTORA emitirá una liquidación a favor de la COLABORADORA, que podría incluir importes negativos en el caso de que existieran devoluciones, y solicitará una factura a la COLABORADORA con la periodicidad detallada.',
  notificaciones_4_1: '4.1. Las Partes han establecido como medio válido para el envío de cualquier comunicación relacionada con el contenido de este contrato el envío de correos electrónicos a las siguientes direcciones:',
  confidencialidad_5_1: '5.1. Las Partes se comprometen a mantener en la más estricta confidencialidad toda la información, tanto oral como escrita, que se haya puesto a disposición de la otra parte, tanto con carácter previo a la firma de esta Licencia como mientras esta esté vigente.',
  confidencialidad_5_2: '5.2. Asimismo, las Partes se comprometen a cumplir con la normativa vigente en materia de protección de datos, obligándose mutuamente a no utilizar los datos personales de la otra parte para finalidades diferentes o incompatibles con la de dar cumplimiento a lo dispuesto en esta Licencia.',
  confidencialidad_5_2b: 'Las Partes podrán ejercer sus derechos de acceso, oposición, rectificación, limitación y portabilidad a través del envío de correos electrónicos a la dirección que consta en la Cláusula de Notificaciones, debiendo aportar una fotocopia del DNI para poder verificar la identidad del remitente.',
  ley_6_1: '6.1. Esta Licencia se regirá e interpretará de acuerdo con el ordenamiento jurídico español y, en concreto, por lo dispuesto en la Ley de Propiedad Intelectual.',
  ley_6_2: '6.2. Ante cualquier incumplimiento, discrepancia o conflicto que pueda surgir entre las Partes, ambas se comprometen, en primer lugar, a intentar resolverlo de forma amistosa, otorgando a la otra parte un plazo de al menos diez (10) días a contar desde la fecha en la que la parte perjudicada remita a la otra los motivos en los que se basa el incumplimiento o el conflicto. Una vez agotada la vía amistosa, las Partes, con renuncia expresa a cualquier fuero que pudiere corresponderles, acuerdan someterse al Tribunal Arbitral de Barcelona (TAB).',
};

interface UserIdentity {
  name: string;
  email: string;
}

export default function ContractDraftView() {
  const { token } = useParams<{ token: string }>();
  const {
    draft, comments, loading,
    addComment, addSelectionComment,
    resolveComment, proposeChange, approveChange, rejectChange,
  } = usePublicDraft(token);
  const { user } = useAuth();

  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');

  // Load identity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('contract_user_identity');
    if (stored) {
      try { setUserIdentity(JSON.parse(stored)); } catch {}
    } else {
      setShowIdentityModal(true);
    }
  }, []);

  const handleIdentitySubmit = () => {
    if (!identityName.trim() || !identityEmail.trim()) return;
    const identity = { name: identityName.trim(), email: identityEmail.trim().toLowerCase() };
    localStorage.setItem('contract_user_identity', JSON.stringify(identity));
    setUserIdentity(identity);
    setShowIdentityModal(false);
  };

  // Determine role from email
  const userRole = useMemo<'producer' | 'collaborator' | 'viewer'>(() => {
    if (!userIdentity || !draft) return 'viewer';
    const draftAny = draft as any;
    if (draftAny.producer_email && userIdentity.email === draftAny.producer_email.toLowerCase()) return 'producer';
    if (draftAny.collaborator_email && userIdentity.email === draftAny.collaborator_email.toLowerCase()) return 'collaborator';
    // Fallback: check form_data emails
    const fd = draft.form_data || {};
    if (fd.productora_email && userIdentity.email === fd.productora_email.toLowerCase()) return 'producer';
    if (fd.colaboradora_email && userIdentity.email === fd.colaboradora_email.toLowerCase()) return 'collaborator';
    return 'viewer';
  }, [userIdentity, draft]);

  const isOwner = !!(user && draft && draft.created_by === user.id);

  const hasPendingNegotiations = comments.some(c =>
    c.comment_status === 'open' || c.comment_status === 'proposing_change' || c.comment_status === 'pending_approval'
  );

  const handleTextSelected = useCallback((selection: TextSelection) => {
    setPendingSelection(selection);
    setShowSidebar(true);
  }, []);

  const handleScrollToClause = useCallback((clauseNumber: string) => {
    const el = contractRef.current?.querySelector(`[data-clause="${clauseNumber}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-amber-100');
      setTimeout(() => el.classList.remove('bg-amber-100'), 2000);
    }
  }, []);

  const scrollToComment = useCallback((commentId: string) => {
    setShowSidebar(true);
    setActiveCommentId(commentId);
    setTimeout(() => {
      document.getElementById(`comment-${commentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setActiveCommentId(null), 3000);
    }, 100);
  }, []);

  const handleMarkReady = async () => {
    if (!draft) return;
    if (hasPendingNegotiations) {
      toast.error('Resuelve todos los comentarios pendientes antes de marcar como listo.');
      return;
    }
    const { error } = await supabase
      .from('contract_drafts')
      .update({ status: 'listo_para_firma' })
      .eq('id', draft.id);
    if (error) toast.error('Error al actualizar estado');
    else toast.success('Marcado como listo para firma');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando documento...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Documento no encontrado</h1>
          <p className="text-muted-foreground text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const formData = draft.form_data || {};
  const isIPLicense = draft.draft_type === 'ip_license';

  // Get comments with selection for highlighting
  const selectionComments = comments.filter(c => c.selected_text && !c.resolved && c.comment_status !== 'resolved' && c.comment_status !== 'approved');

  return (
    <div className="min-h-screen bg-muted/40 flex">
      {/* Main content */}
      <div className="flex-1 py-8 px-4 md:px-8 overflow-y-auto">
        {/* Status header */}
        <div className="max-w-[794px] mx-auto mb-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <DraftStatusBanner status={draft.status} />
            <Badge variant="outline" className="text-xs">
              {isIPLicense ? 'Licencia de Propiedad Intelectual' : 'Contrato de Booking'}
            </Badge>
            {/* Mobile sidebar toggle */}
            <Button variant="outline" size="sm" className="lg:hidden ml-auto" onClick={() => setShowSidebar(!showSidebar)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Comentarios ({comments.filter(c => !c.parent_comment_id).length})
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{draft.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Última actualización: {formatTimeAgo(draft.updated_at)}</span>
          </div>

          {/* Negotiation banner */}
          <NegotiationBanner comments={comments} status={draft.status} />

          {draft.status === 'listo_para_firma' && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 text-sm">✓ Acuerdo alcanzado - Listo para firmar</p>
                <p className="text-xs text-green-600/80">Este documento ya no se modificará. Se convertirá en PDF para su firma.</p>
              </div>
            </div>
          )}

          {isOwner && (draft.status === 'borrador' || draft.status === 'en_negociacion') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkReady}
              disabled={hasPendingNegotiations}
              title={hasPendingNegotiations ? 'Resuelve los comentarios pendientes primero' : ''}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como listo para firma
            </Button>
          )}
        </div>

        {/* Document – A4-like page with text selection */}
        <TextSelectionHandler
          onTextSelected={handleTextSelected}
          enabled={draft.status === 'borrador' || draft.status === 'en_negociacion'}
        >
          <div
            ref={contractRef}
            className="max-w-[794px] mx-auto bg-white shadow-lg border rounded"
            style={{
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
              fontSize: '11pt',
              lineHeight: 1.7,
              color: '#1a1a1a',
              padding: '60px 80px',
              textAlign: 'justify',
            }}
          >
            {isIPLicense
              ? renderIPLicenseContent(formData, draft.clauses_data, selectionComments, scrollToComment)
              : renderBookingContent(formData, draft.clauses_data)}
          </div>
        </TextSelectionHandler>
      </div>

      {/* Comments sidebar */}
      <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-80 border-l bg-muted/30 sticky top-0 h-screen overflow-hidden flex-shrink-0`}>
        <DraftCommentsSidebar
          comments={comments}
          onAddComment={addComment}
          onAddSelectionComment={addSelectionComment}
          onResolve={resolveComment}
          onProposeChange={proposeChange}
          onApproveChange={approveChange}
          onRejectChange={rejectChange}
          isOwner={isOwner}
          userRole={userRole}
          defaultAuthorName={userIdentity?.name || (isOwner ? 'Equipo' : '')}
          pendingSelection={pendingSelection}
          onClearSelection={() => setPendingSelection(null)}
          onScrollToClause={handleScrollToClause}
          activeCommentId={activeCommentId}
        />
      </div>

      {/* Identity modal */}
      <Dialog open={showIdentityModal} onOpenChange={setShowIdentityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Identifícate para participar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Tu nombre"
              value={identityName}
              onChange={e => setIdentityName(e.target.value)}
            />
            <Input
              placeholder="Tu email"
              type="email"
              value={identityEmail}
              onChange={e => setIdentityEmail(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleIdentitySubmit}
              disabled={!identityName.trim() || !identityEmail.trim()}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared style objects ────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  textAlign: 'center', fontWeight: 'bold', fontSize: '12pt',
  textTransform: 'uppercase', marginTop: '32px', marginBottom: '16px', letterSpacing: '0.5px',
};

const clauseTitle: React.CSSProperties = {
  fontWeight: 'bold', fontSize: '11pt', marginTop: '28px', marginBottom: '12px',
};

const paragraph: React.CSSProperties = {
  marginBottom: '12px', textAlign: 'justify', textIndent: '24px',
};

const subItem: React.CSSProperties = {
  marginLeft: '40px', marginBottom: '4px',
};

const romanItem: React.CSSProperties = {
  marginBottom: '12px', textAlign: 'justify', paddingLeft: '32px', textIndent: '-32px',
};

// Helper to render a highlighted clause paragraph with inline yellow highlights
function ClauseParagraph({ clauseKey, text, style, comments, onCommentClick }: {
  clauseKey: string; text: string; style?: React.CSSProperties;
  comments?: Array<{ selected_text: string | null; id: string }>;
  onCommentClick?: (commentId: string) => void;
}) {
  const relevantComments = comments?.filter(c => c.selected_text && text.includes(c.selected_text)) || [];

  if (relevantComments.length === 0) {
    return (
      <p data-clause={clauseKey} style={{ ...paragraph, ...style, transition: 'background 0.3s' }}>
        {text}
      </p>
    );
  }

  // Build highlighted segments
  const renderHighlightedText = () => {
    let remaining = text;
    const parts: React.ReactNode[] = [];
    let idx = 0;

    // Sort comments by position in text (earliest first)
    const sorted = [...relevantComments].sort((a, b) => {
      const posA = remaining.indexOf(a.selected_text!);
      const posB = remaining.indexOf(b.selected_text!);
      return posA - posB;
    });

    for (const comment of sorted) {
      const selectedText = comment.selected_text!;
      const pos = remaining.indexOf(selectedText);
      if (pos === -1) continue;

      // Text before the highlight
      if (pos > 0) {
        parts.push(<span key={`t-${idx++}`}>{remaining.slice(0, pos)}</span>);
      }

      // Highlighted text
      parts.push(
        <span
          key={`h-${comment.id}`}
          style={{
            backgroundColor: '#FFF9C4',
            borderBottom: '2px solid #F59E0B',
            cursor: 'pointer',
            borderRadius: '2px',
            padding: '0 1px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick?.(comment.id);
          }}
          title="💬 Ver comentario"
        >
          {selectedText}
        </span>
      );

      remaining = remaining.slice(pos + selectedText.length);
    }

    // Remaining text
    if (remaining) {
      parts.push(<span key={`t-${idx++}`}>{remaining}</span>);
    }

    return parts;
  };

  return (
    <p data-clause={clauseKey} style={{ ...paragraph, ...style, transition: 'background 0.3s' }}>
      {renderHighlightedText()}
    </p>
  );
}

// ── IP License ──────────────────────────────────────────────────────────
function renderIPLicenseContent(
  formData: any,
  clausesData: any,
  selectionComments: Array<{ selected_text: string | null; id: string }>,
) {
  const d = formData;
  const rawClauses = { ...DEFAULT_IP_CLAUSES, ...(clausesData || {}) };
  const c: Record<string, string> = {};
  for (const k of Object.keys(rawClauses)) {
    c[k] = resolveClause(rawClauses[k], d);
  }

  return (
    <>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
        Licencia de Cesión de Derechos de Propiedad Intelectual
      </h2>

      <p style={{ textAlign: 'left', marginBottom: '28px' }}>
        En Barcelona, a {s(d.fecha_dia)} de {s(d.fecha_mes)} de {s(d.fecha_anio)}
      </p>

      <p style={sectionTitle}>REUNIDOS</p>

      <p data-clause="reunidos" style={paragraph}>
        <strong>DE UNA PARTE, </strong>
        {s(d.productora_nombre)}, mayor de edad, con {s(d.productora_doc_tipo)} {s(d.productora_dni)} y domicilio a estos efectos en {s(d.productora_domicilio)}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará la PRODUCTORA.
      </p>

      <p data-clause="reunidos" style={paragraph}>
        <strong>DE OTRA PARTE, </strong>
        {s(d.colaboradora_nombre)}, mayor de edad, con {s(d.colaboradora_doc_tipo)} {s(d.colaboradora_dni)} y domicilio a estos efectos en {s(d.colaboradora_domicilio)}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará el COLABORADOR o la COLABORADORA indistintamente.
      </p>

      <p data-clause="reunidos" style={{ ...paragraph, textIndent: '24px' }}>
        En adelante, ambas partes, serán denominadas conjuntamente como las Partes.
      </p>
      <p data-clause="reunidos" style={{ ...paragraph, textIndent: '24px' }}>
        Las Partes se reconocen recíprocamente la capacidad legal necesaria para contratar y obligarse y, a tal efecto,
      </p>

      <p style={sectionTitle}>MANIFIESTAN</p>

      <p data-clause="manifiestan-I" style={romanItem}>
        <strong>I) </strong>
        Que la PRODUCTORA, es una compositora, intérprete y productora fonográfica que, en su calidad de productora fonográfica, está produciendo un sencillo fonográfico titulado tentativamente "{s(d.grabacion_titulo)}" (el Sencillo) que será explotado comercialmente bajo su nombre artístico "{s(d.productora_nombre_artistico)}", por sí o por terceros.
      </p>

      <p data-clause="manifiestan-II" style={romanItem}>
        <strong>II) </strong>
        Que la PRODUCTORA ha solicitado a la COLABORADORA que participe, en calidad de música intérprete y/o ejecutante en una o más obras musicales (la/s Grabación/es), las cuales se detallarán, o para su explotación en forma de sencillo fonográfico, incluyendo o no videoclip y/o materiales audiovisuales promocionales.
      </p>

      <p data-clause="manifiestan-III" style={romanItem}>
        <strong>III) </strong>
        Que la COLABORADORA, conocida artísticamente como "{s(d.colaboradora_nombre_artistico)}", es una intérprete musical independiente, facultada para aceptar la propuesta de colaboración de la PRODUCTORA, en los términos que se dirán, que no está sujeta a contratos de exclusiva que se lo impidan o bien habiendo obtenido las autorizaciones pertinentes de terceros para su aceptación y posterior cesión de derechos de propiedad intelectual sobre sus interpretaciones musicales.
      </p>

      <p data-clause="manifiestan-IV" style={romanItem}>
        <strong>IV) </strong>
        Que la PRODUCTORA ha llevado a cabo la fijación de las interpretaciones de la COLABORADORA en la/s Grabación/es a satisfacción de las Partes.
      </p>

      <p data-clause="manifiestan" style={{ ...paragraph, textIndent: '24px' }}>
        Con la finalidad de acordar los términos y condiciones de la colaboración entre las Partes y formalizar la cesión de los derechos de propiedad intelectual de la COLABORADORA a favor de la PRODUCTORA, las Partes celebran el presente contrato de Licencia de Derechos de Propiedad Intelectual y acuerdan regirse de conformidad a las siguientes
      </p>

      <p style={sectionTitle}>CLÁUSULAS</p>

      <p style={clauseTitle}>1. OBJETO</p>
      <ClauseParagraph clauseKey="1.1" text={c.objeto_1_1} comments={selectionComments} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="1.1">
        <p style={subItem}><strong>a. </strong><strong>Título de la obra Grabación: </strong>{s(d.grabacion_titulo)}</p>
        <p style={subItem}><strong>b. </strong><strong>Calidad en que interviene la COLABORADORA: </strong>{s(d.grabacion_calidad)}</p>
        <p style={subItem}><strong>c. </strong><strong>Duración de la Grabación: </strong>{s(d.grabacion_duracion)}</p>
        <p style={subItem}><strong>d. </strong><strong>Participación (Sí/No) en videoclip de la Grabación: </strong>{s(d.grabacion_videoclip)}</p>
        <p style={subItem}><strong>e. </strong><strong>Fecha de la fijación: </strong>{s(d.grabacion_fecha_fijacion)}</p>
        <p style={subItem}><strong>f. </strong><strong>Carácter de la intervención: </strong>{s(d.grabacion_caracter)}</p>
      </div>

      <ClauseParagraph clauseKey="1.2" text={c.objeto_1_2} comments={selectionComments} />

      <p style={clauseTitle}>2. ALCANCE DE LA CESIÓN DE DERECHOS</p>
      <ClauseParagraph clauseKey="2.1" text={c.alcance_2_1} comments={selectionComments} />

      <div style={{ marginLeft: '48px', marginBottom: '16px' }} data-clause="2.1">
        <p style={{ marginBottom: '4px' }}><strong>a. PERIODO: </strong>A perpetuidad.</p>
        <p style={{ marginBottom: '4px' }}><strong>b. TERRITORIO: </strong>El Universo.</p>
        <p style={{ marginBottom: '4px' }}><strong>c. MEDIOS: </strong>Todos los medios existentes durante la vigencia de este contrato.</p>
      </div>

      <ClauseParagraph clauseKey="2.2" text={c.alcance_2_2} comments={selectionComments} />
      <ClauseParagraph clauseKey="2.3" text={c.alcance_2_3} comments={selectionComments} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="2.3">
        <p style={subItem}><strong>a. </strong><strong>Nombre artístico: </strong>{s(d.acreditacion_nombre)}</p>
        <p style={subItem}><strong>b. </strong><strong>Carácter de la intervención: </strong>{s(d.acreditacion_caracter)}</p>
      </div>

      <ClauseParagraph clauseKey="2.4" text={c.alcance_2_4} comments={selectionComments} />
      <ClauseParagraph clauseKey="2.5" text={c.alcance_2_5} comments={selectionComments} />

      <p style={clauseTitle}>3. CONTRAPRESTACIÓN</p>
      <ClauseParagraph clauseKey="3.1" text={c.contraprestacion_3_1} comments={selectionComments} />
      <ClauseParagraph clauseKey="3.2" text={c.contraprestacion_3_2} comments={selectionComments} />
      <ClauseParagraph clauseKey="3.3" text={c.contraprestacion_3_3} comments={selectionComments} />
      <ClauseParagraph clauseKey="3.4" text={c.contraprestacion_3_4} comments={selectionComments} />
      <ClauseParagraph clauseKey="3.5" text={c.contraprestacion_3_5} comments={selectionComments} />

      <p style={clauseTitle}>4. NOTIFICACIONES</p>
      <ClauseParagraph clauseKey="4.1" text={c.notificaciones_4_1} comments={selectionComments} />

      <div style={{ marginLeft: '40px', marginBottom: '16px' }} data-clause="4.1">
        <p style={subItem}><strong>a. </strong><strong>De la PRODUCTORA: </strong>{s(d.productora_email)}</p>
        <p style={subItem}><strong>b. </strong><strong>De la COLABORADORA: </strong>{s(d.colaboradora_email)}</p>
      </div>

      <p style={clauseTitle}>5. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</p>
      <ClauseParagraph clauseKey="5.1" text={c.confidencialidad_5_1} comments={selectionComments} />
      <ClauseParagraph clauseKey="5.2" text={c.confidencialidad_5_2} comments={selectionComments} />
      <ClauseParagraph clauseKey="5.2b" text={c.confidencialidad_5_2b} comments={selectionComments} />

      <p style={clauseTitle}>6. LEY APLICABLE Y RESOLUCIÓN DE CONFLICTOS</p>
      <ClauseParagraph clauseKey="6.1" text={c.ley_6_1} comments={selectionComments} />
      <ClauseParagraph clauseKey="6.2" text={c.ley_6_2} comments={selectionComments} />

      <p data-clause="cierre" style={{ ...paragraph, marginTop: '28px' }}>
        Y en señal de conformidad con lo previsto en este documento y para hacer efectiva la cesión de derechos que contiene esta Licencia, las Partes la firman por duplicado en el lugar y la fecha que consta en el encabezado de este documento.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', marginTop: '60px' }}>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>La PRODUCTORA</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_productora || d.productora_nombre)}</p>
        </div>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>La COLABORADORA</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(d.firma_colaboradora || d.colaboradora_nombre)}</p>
        </div>
      </div>
    </>
  );
}

// ── Booking Contract ────────────────────────────────────────────────────
function renderBookingContent(formData: any, clauses: any) {
  const agent = formData.agentData || formData;
  const promoter = formData.promoterData || {};
  const conditions = formData.conditions || {};
  const legal = clauses || formData.legalClauses || {};

  return (
    <>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
        Contrato de Representación Artística
      </h2>

      <p style={sectionTitle}>EL AGENTE</p>
      <p style={paragraph}>{s(agent.nombre)} — CIF: {s(agent.cif)}</p>
      <p style={paragraph}>Dirección: {s(agent.direccion)}</p>
      <p style={paragraph}>Representado por: {s(agent.representante)}</p>

      <p style={sectionTitle}>EL PROMOTOR</p>
      <p style={paragraph}>{s(promoter.nombre)} — CIF: {s(promoter.cif)}</p>
      <p style={paragraph}>Dirección: {s(promoter.direccion)}</p>
      <p style={paragraph}>Email: {s(promoter.email)}</p>

      <p style={clauseTitle}>CONDICIONES PARTICULARES</p>
      <div style={{ marginLeft: '24px', marginBottom: '16px' }}>
        <p style={subItem}><strong>Artista:</strong> {s(conditions.artista)}</p>
        <p style={subItem}><strong>Fecha:</strong> {s(conditions.fecha)}</p>
        <p style={subItem}><strong>Ciudad:</strong> {s(conditions.ciudad)}</p>
        <p style={subItem}><strong>Venue:</strong> {s(conditions.venue)}</p>
        <p style={subItem}><strong>Hora:</strong> {s(conditions.hora)}</p>
        <p style={subItem}><strong>Duración:</strong> {s(conditions.duracion)}</p>
        <p style={subItem}><strong>Fee:</strong> {conditions.fee ? `${conditions.fee}€` : s('')}</p>
        <p style={subItem}><strong>Aforo:</strong> {s(conditions.aforo)}</p>
      </div>

      {legal && Object.keys(legal).length > 0 && (
        <>
          <p style={clauseTitle}>CLÁUSULAS</p>
          {Object.entries(legal).map(([key, value]) => (
            <p key={key} data-clause={key} style={paragraph}>{String(value)}</p>
          ))}
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', marginTop: '60px' }}>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>EL AGENTE</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(agent.representante)}</p>
        </div>
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '48px' }}>EL PROMOTOR</p>
          <div style={{ borderBottom: '1px solid #1a1a1a', width: '200px', margin: '0 auto' }} />
          <p style={{ fontSize: '10pt', marginTop: '6px' }}>{s(promoter.representante)}</p>
        </div>
      </div>
    </>
  );
}
