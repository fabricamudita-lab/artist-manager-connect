import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContractData {
  id: string;
  file_name: string;
  file_url: string;
  content: string | null;
  status: string;
  signer_name: string | null;
  signature_image_url: string | null;
  signed_at: string | null;
  booking: {
    id: string;
    venue: string | null;
    ciudad: string | null;
    fecha: string | null;
    promotor: string | null;
    fee: number | null;
    festival_ciclo: string | null;
  } | null;
}

export default function SignContract() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const sigPadRef = useRef<SignatureCanvas>(null);
  
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
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

      if (fetchError || !data) {
        setError('Contrato no encontrado o el enlace ha expirado.');
        return;
      }

      // Fetch booking info
      const { data: bookingData } = await supabase
        .from('booking_offers')
        .select('id, venue, ciudad, fecha, promotor, fee, festival_ciclo')
        .eq('id', data.booking_id)
        .single();

      setContract({
        ...data,
        booking: bookingData || null,
      } as ContractData);

    } catch (err) {
      console.error('Error fetching contract:', err);
      setError('Error al cargar el contrato.');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleSign = async () => {
    if (!contract) return;

    if (!signerName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor, introduce tu nombre completo.',
        variant: 'destructive',
      });
      return;
    }

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
      const fileName = `${contract.id}-${Date.now()}.png`;
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

      // Update document with signature
      const { error: updateError } = await supabase
        .from('booking_documents')
        .update({
          status: 'signed',
          signer_name: signerName.trim(),
          signature_image_url: publicUrl,
          signed_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      toast({
        title: '¡Contrato firmado!',
        description: 'El contrato ha sido firmado correctamente.',
      });

      // Refresh to show signed state
      fetchContract();

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

  if (error || !contract) {
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
  if (contract.status === 'signed') {
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
                  <span className="font-medium">{contract.signer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de firma:</span>
                  <span className="font-medium">
                    {contract.signed_at ? new Date(contract.signed_at).toLocaleString('es-ES') : '-'}
                  </span>
                </div>
              </div>

              {contract.signature_image_url && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Firma:</p>
                  <img 
                    src={contract.signature_image_url} 
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

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {contract.file_name}
            </CardTitle>
            <CardDescription>Detalles del evento</CardDescription>
          </CardHeader>
          <CardContent>
            {contract.booking && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.booking.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{contract.booking.venue}</span>
                  </div>
                )}
                {contract.booking.ciudad && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{contract.booking.ciudad}</span>
                  </div>
                )}
                {contract.booking.fecha && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(contract.booking.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
                {contract.booking.festival_ciclo && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>{contract.booking.festival_ciclo}</span>
                  </div>
                )}
                {contract.booking.fee && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg">
                      {contract.booking.fee.toLocaleString()}€
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Content */}
        {contract.content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenido del Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {contract.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Preview */}
        {contract.file_url && contract.file_url !== 'generated' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => window.open(contract.file_url, '_blank')}
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
              Introduce tu nombre y dibuja tu firma en el recuadro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="signerName">Nombre completo del firmante *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ej: Juan García López"
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label>Firma *</Label>
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