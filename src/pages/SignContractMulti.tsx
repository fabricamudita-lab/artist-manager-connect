import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  CheckCircle, 
  Eraser, 
  PenTool,
  Calendar,
  MapPin,
  Music,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SignerData {
  id: string;
  name: string;
  role: string;
  status: string;
  signature_image_url: string | null;
  signed_at: string | null;
  document: {
    id: string;
    file_name: string;
    file_url: string;
    content: string | null;
    booking_id: string | null;
    contract_type: string;
    booking_document_id: string | null;
  } | null;
  booking: {
    venue: string | null;
    ciudad: string | null;
    fecha: string | null;
    promotor: string | null;
    fee: number | null;
    festival_ciclo: string | null;
  } | null;
}

export default function SignContractMulti() {
  const { token } = useParams<{ token: string }>();
  const sigPadRef = useRef<SignatureCanvas>(null);
  
  const [signer, setSigner] = useState<SignerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchSigner();
    }
  }, [token]);

  const fetchSigner = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to find in contract_signers (new multi-signer system)
      const { data: signerData, error: signerError } = await supabase
        .from('contract_signers')
        .select(`
          id,
          name,
          role,
          status,
          signature_image_url,
          signed_at,
          document_id
        `)
        .eq('token', token)
        .single();

      if (signerData) {
        // Fetch document info from unified contracts table
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id, title, file_url, description, booking_id, contract_type, booking_document_id')
          .eq('id', signerData.document_id)
          .single();

        // If contract has a booking_document_id, get content from there
        let content: string | null = null;
        if (contractData?.booking_document_id) {
          const { data: bdData } = await supabase
            .from('booking_documents')
            .select('content')
            .eq('id', contractData.booking_document_id)
            .single();
          content = bdData?.content || null;
        }

        let bookingData = null;
        if (contractData?.booking_id) {
          const { data: booking } = await supabase
            .from('booking_offers')
            .select('venue, ciudad, fecha, promotor, fee, festival_ciclo')
            .eq('id', contractData.booking_id)
            .single();
          bookingData = booking;
        }

        setSigner({
          ...signerData,
          document: contractData ? {
            id: contractData.id,
            file_name: contractData.title,
            file_url: contractData.file_url || '',
            content,
            booking_id: contractData.booking_id,
            contract_type: contractData.contract_type || 'booking',
            booking_document_id: contractData.booking_document_id,
          } : null,
          booking: bookingData,
        } as SignerData);
        return;
      }

      // Fallback: try old single-signer system (booking_documents.contract_token)
      const { data: legacyData, error: legacyError } = await supabase
        .from('booking_documents')
        .select(`
          id,
          file_name,
          file_url,
          content,
          status,
          signer_name,
          signature_image_url,
          signed_at,
          booking_id
        `)
        .eq('contract_token', token)
        .single();

      if (legacyData) {
        const { data: bookingData } = await supabase
          .from('booking_offers')
          .select('venue, ciudad, fecha, promotor, fee, festival_ciclo')
          .eq('id', legacyData.booking_id)
          .single();

        setSigner({
          id: legacyData.id,
          name: legacyData.signer_name || 'Firmante',
          role: 'Firmante',
          status: legacyData.status === 'signed' ? 'signed' : 'pending',
          signature_image_url: legacyData.signature_image_url,
          signed_at: legacyData.signed_at,
          document: {
            id: legacyData.id,
            file_name: legacyData.file_name,
            file_url: legacyData.file_url,
            content: legacyData.content,
            booking_id: legacyData.booking_id,
            contract_type: 'booking',
            booking_document_id: legacyData.id,
          },
          booking: bookingData || null,
        });
        return;
      }

      setError('Contrato no encontrado o el enlace ha expirado.');
    } catch (err) {
      console.error('Error fetching signer:', err);
      setError('Error al cargar el contrato.');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleSign = async () => {
    if (!signer) return;

    if (sigPadRef.current?.isEmpty()) {
      toast({
        title: 'Firma requerida',
        description: 'Por favor, dibuja tu firma en el recuadro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSigning(true);

      // Get signature as base64
      const signatureDataUrl = sigPadRef.current?.toDataURL('image/png');
      if (!signatureDataUrl) throw new Error('No se pudo obtener la firma');

      // Convert base64 to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      // Upload signature to storage
      const fileName = `${signer.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      // Check if this is a multi-signer or legacy single-signer
      const isMultiSigner = signer.document?.id !== signer.id;

      if (isMultiSigner) {
        // Update contract_signers table
        const { error: updateError } = await supabase
          .from('contract_signers')
          .update({
            status: 'signed',
            signature_image_url: publicUrl,
            signed_at: new Date().toISOString(),
          })
          .eq('id', signer.id);

        if (updateError) throw updateError;

        // Check if all signers have signed, then update document status
        const { data: allSigners } = await supabase
          .from('contract_signers')
          .select('status')
          .eq('document_id', signer.document?.id);

        const allSigned = allSigners?.every(s => s.status === 'signed');
        if (allSigned) {
          // Update unified contracts table
          await supabase
            .from('contracts')
            .update({ status: 'firmado' })
            .eq('id', signer.document?.id);

          // Also update booking_documents if it's a booking contract
          if (signer.document?.booking_document_id) {
            await supabase
              .from('booking_documents')
              .update({ status: 'signed' })
              .eq('id', signer.document.booking_document_id);
          }
        }
      } else {
        // Legacy: update booking_documents directly
        const { error: updateError } = await supabase
          .from('booking_documents')
          .update({
            status: 'signed',
            signer_name: signer.name,
            signature_image_url: publicUrl,
            signed_at: new Date().toISOString(),
          })
          .eq('id', signer.id);

        if (updateError) throw updateError;
      }

      toast({
        title: '¡Contrato firmado!',
        description: 'El contrato ha sido firmado correctamente.',
      });

      // Refresh to show signed state
      fetchSigner();

    } catch (err) {
      console.error('Error signing contract:', err);
      toast({
        title: 'Error',
        description: 'No se pudo firmar el contrato. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando contrato...</p>
        </div>
      </div>
    );
  }

  if (error || !signer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error || 'Contrato no encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed
  if (signer.status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Contrato Firmado</CardTitle>
              <CardDescription>
                Este contrato ya ha sido firmado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firmante:</span>
                  <span className="font-medium">{signer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rol:</span>
                  <span className="font-medium">{signer.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de firma:</span>
                  <span className="font-medium">
                    {signer.signed_at ? new Date(signer.signed_at).toLocaleString('es-ES') : '-'}
                  </span>
                </div>
              </div>

              {signer.signature_image_url && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Firma:</p>
                  <img 
                    src={signer.signature_image_url} 
                    alt="Firma" 
                    className="max-h-24 mx-auto"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Firma de Contrato</h1>
          <p className="text-muted-foreground mt-2">
            Revisa los detalles y firma el contrato electrónicamente
          </p>
        </div>

        {/* Signing as */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Firmando como:</p>
                <p className="text-lg font-semibold">{signer.name}</p>
                <Badge variant="outline">{signer.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {signer.document?.file_name || 'Contrato'}
            </CardTitle>
            <CardDescription>Detalles del evento</CardDescription>
          </CardHeader>
          <CardContent>
            {signer.booking && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signer.booking.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{signer.booking.venue}</span>
                  </div>
                )}
                {signer.booking.ciudad && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{signer.booking.ciudad}</span>
                  </div>
                )}
                {signer.booking.fecha && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(signer.booking.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
                {signer.booking.festival_ciclo && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>{signer.booking.festival_ciclo}</span>
                  </div>
                )}
                {signer.booking.fee && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg">
                      {signer.booking.fee.toLocaleString()}€
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Content */}
        {signer.document?.content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenido del Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {signer.document.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Preview */}
        {signer.document?.file_url && signer.document.file_url !== 'generated' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => window.open(signer.document?.file_url, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver documento completo
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Tu Firma
            </CardTitle>
            <CardDescription>
              Dibuja tu firma en el recuadro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="border-2 border-dashed rounded-lg bg-white dark:bg-gray-950">
                <SignatureCanvas
                  ref={sigPadRef}
                  canvasProps={{
                    className: 'w-full h-48 cursor-crosshair',
                    style: { width: '100%', height: '200px' }
                  }}
                  backgroundColor="transparent"
                  penColor="black"
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSignature}
                className="text-muted-foreground"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Borrar firma
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Al hacer clic en "Firmar y Aceptar", confirmo que he leído y acepto 
                los términos del contrato, y que mi firma electrónica tiene la misma 
                validez legal que una firma manuscrita.
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full md:w-auto"
              onClick={handleSign}
              disabled={signing}
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Firmar y Aceptar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
