import { useParams } from 'react-router-dom';
import { usePublicDraft } from '@/hooks/useContractDrafts';
import { useAuth } from '@/hooks/useAuth';
import { DraftStatusBanner } from '@/components/contract-drafts/DraftStatusBanner';
import { DraftCommentsSidebar } from '@/components/contract-drafts/DraftCommentsSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
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

export default function ContractDraftView() {
  const { token } = useParams<{ token: string }>();
  const { draft, comments, loading, addComment, resolveComment } = usePublicDraft(token);
  const { user } = useAuth();

  const isOwner = !!(user && draft && draft.created_by === user.id);

  const handleMarkReady = async () => {
    if (!draft) return;
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <DraftStatusBanner status={draft.status} />
            <Badge variant="outline" className="text-xs">
              {isIPLicense ? 'Licencia de Propiedad Intelectual' : 'Contrato de Booking'}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{draft.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Última actualización: {formatTimeAgo(draft.updated_at)}</span>
          </div>

          {draft.status === 'listo_para_firma' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 text-sm">✓ Acuerdo alcanzado - Listo para firmar</p>
                <p className="text-xs text-green-600/80">Este documento ya no se modificará. Se convertirá en PDF para su firma.</p>
              </div>
            </div>
          )}

          {isOwner && (draft.status === 'borrador' || draft.status === 'en_negociacion') && (
            <Button variant="outline" size="sm" onClick={handleMarkReady}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como listo para firma
            </Button>
          )}
        </div>

        {/* Document content */}
        <div className="bg-card border rounded-lg p-6 md:p-10 shadow-sm space-y-6 font-serif text-sm leading-relaxed">
          {isIPLicense ? renderIPLicenseContent(formData, draft.clauses_data) : renderBookingContent(formData, draft.clauses_data)}
        </div>
      </div>

      {/* Comments sidebar */}
      <div className="hidden lg:block w-80 border-l bg-muted/30 sticky top-0 h-screen overflow-hidden">
        <DraftCommentsSidebar
          comments={comments}
          onAddComment={addComment}
          onResolve={resolveComment}
          isOwner={isOwner}
          defaultAuthorName={isOwner ? 'Equipo' : ''}
        />
      </div>
    </div>
  );
}

function renderIPLicenseContent(formData: any, clauses: any) {
  const d = formData;
  const c = clauses || {};
  return (
    <>
      <h2 className="text-center font-bold text-base uppercase tracking-wide">
        Contrato de Cesión de Derechos de Propiedad Intelectual
      </h2>
      <p>
        En la ciudad de Madrid, a {d.fecha_dia || '___'} de {d.fecha_mes || '___'} de {d.fecha_anio || '___'}.
      </p>

      <div className="space-y-2">
        <h3 className="font-bold">INTERVIENEN</h3>
        <p>
          <strong>LA PRODUCTORA:</strong> {d.productora_nombre || '___'}, con {d.productora_doc_tipo || 'DNI/NIE'} {d.productora_dni || '___'},
          con domicilio en {d.productora_domicilio || '___'}, nombre artístico "{d.productora_nombre_artistico || '___'}",
          email {d.productora_email || '___'}.
        </p>
        <p>
          <strong>LA COLABORADORA:</strong> {d.colaboradora_nombre || '___'}, con {d.colaboradora_doc_tipo || 'DNI/NIE'} {d.colaboradora_dni || '___'},
          con domicilio en {d.colaboradora_domicilio || '___'}, nombre artístico "{d.colaboradora_nombre_artistico || '___'}",
          email {d.colaboradora_email || '___'}.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">DATOS DE LA GRABACIÓN</h3>
        <ul className="list-none space-y-1">
          <li><strong>Título:</strong> {d.grabacion_titulo || d.titulo_sencillo || '___'}</li>
          <li><strong>Calidad:</strong> {d.grabacion_calidad || '___'}</li>
          <li><strong>Duración:</strong> {d.grabacion_duracion || '___'}</li>
          <li><strong>Videoclip:</strong> {d.grabacion_videoclip || '___'}</li>
          <li><strong>Fecha de fijación:</strong> {d.grabacion_fecha_fijacion || '___'}</li>
          <li><strong>Carácter:</strong> {d.grabacion_caracter || '___'}</li>
        </ul>
      </div>

      {c && Object.keys(c).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">CLÁUSULAS</h3>
          {Object.entries(c).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-6 grid grid-cols-2 gap-8 text-center">
        <div>
          <p className="font-bold mb-8">La PRODUCTORA</p>
          <div className="border-t inline-block w-48" />
          <p className="text-xs mt-1">{d.firma_productora || d.productora_nombre || '___'}</p>
        </div>
        <div>
          <p className="font-bold mb-8">La COLABORADORA</p>
          <div className="border-t inline-block w-48" />
          <p className="text-xs mt-1">{d.firma_colaboradora || d.colaboradora_nombre || '___'}</p>
        </div>
      </div>
    </>
  );
}

function renderBookingContent(formData: any, clauses: any) {
  const agent = formData.agentData || formData;
  const promoter = formData.promoterData || {};
  const conditions = formData.conditions || {};
  const payment = formData.paymentTerms || {};
  const legal = clauses || formData.legalClauses || {};

  return (
    <>
      <h2 className="text-center font-bold text-base uppercase tracking-wide">
        Contrato de Representación Artística
      </h2>

      <div className="space-y-2">
        <h3 className="font-bold">EL AGENTE</h3>
        <p>{agent.nombre || '___'} — CIF: {agent.cif || '___'}</p>
        <p>Dirección: {agent.direccion || '___'}</p>
        <p>Representado por: {agent.representante || '___'}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">EL PROMOTOR</h3>
        <p>{promoter.nombre || '___'} — CIF: {promoter.cif || '___'}</p>
        <p>Dirección: {promoter.direccion || '___'}</p>
        <p>Email: {promoter.email || '___'}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">CONDICIONES PARTICULARES</h3>
        <ul className="list-none space-y-1">
          <li><strong>Artista:</strong> {conditions.artista || '___'}</li>
          <li><strong>Fecha:</strong> {conditions.fecha || '___'}</li>
          <li><strong>Ciudad:</strong> {conditions.ciudad || '___'}</li>
          <li><strong>Venue:</strong> {conditions.venue || '___'}</li>
          <li><strong>Hora:</strong> {conditions.hora || '___'}</li>
          <li><strong>Duración:</strong> {conditions.duracion || '___'}</li>
          <li><strong>Fee:</strong> {conditions.fee ? `${conditions.fee}€` : '___'}</li>
          <li><strong>Aforo:</strong> {conditions.aforo || '___'}</li>
        </ul>
      </div>

      {legal && Object.keys(legal).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">CLÁUSULAS</h3>
          {Object.entries(legal).map(([key, value]) => (
            <div key={key}>
              <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-6 grid grid-cols-2 gap-8 text-center">
        <div>
          <p className="font-bold mb-8">EL AGENTE</p>
          <div className="border-t inline-block w-48" />
          <p className="text-xs mt-1">{agent.representante || '___'}</p>
        </div>
        <div>
          <p className="font-bold mb-8">EL PROMOTOR</p>
          <div className="border-t inline-block w-48" />
          <p className="text-xs mt-1">{promoter.representante || '___'}</p>
        </div>
      </div>
    </>
  );
}
