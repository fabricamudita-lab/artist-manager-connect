import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Mail, 
  Phone, 
  MessageSquare,
  Play,
  ExternalLink,
  FileText,
  Calendar,
  MapPin,
  ImageIcon,
  Music,
  FileDown,
  Globe,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { EPKData, EPKPhoto, EPKVideo, EPKAudio, EPKDocument } from '@/hooks/useEPK';
import { EmbedErrorBoundary } from '@/components/EmbedErrorBoundary';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useResponsiveTesting } from '@/hooks/useResponsiveTesting';
import ZipRateLimiter from '@/utils/zipRateLimiter';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PublicEPKPageProps {}

export const PublicEPKPage: React.FC<PublicEPKPageProps> = () => {
  const { slug } = useParams<{ slug: string }>();
  const [epk, setEPK] = useState<EPKData | null>(null);
  const [photos, setPhotos] = useState<EPKPhoto[]>([]);
  const [videos, setVideos] = useState<EPKVideo[]>([]);
  const [audios, setAudios] = useState<EPKAudio[]>([]);
  const [documents, setDocuments] = useState<EPKDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<EPKPhoto | null>(null);

  // Hooks for enhanced functionality
  const themeHook = useTheme();
  const detectedLanguage = useI18n().detectLanguage();
  const { t, language } = useI18n(detectedLanguage);
  const { currentBreakpoint, deviceType } = useResponsiveTesting();
  const rateLimiter = ZipRateLimiter.getInstance();

  useEffect(() => {
    if (slug) {
      fetchEPK(slug);
    }
  }, [slug]);

  const isGuestMode = new URLSearchParams(window.location.search).has('guest');

  const fetchEPK = async (epkSlug: string) => {
    setLoading(true);
    try {
      // Fetch EPK by slug
      const { data: epkData, error: epkError } = await supabase
        .from('epks')
        .select('*')
        .eq('slug', epkSlug)
        .single();

      if (epkError) {
        if (epkError.code === 'PGRST116') {
          setError('EPK no encontrado');
        } else {
          throw epkError;
        }
        return;
      }

      // Check expiration
      if (epkData.expira_el && new Date(epkData.expira_el) < new Date()) {
        setError('Este EPK ha expirado y ya no está disponible');
        return;
      }

      // Check visibility and access rules
      if (!isGuestMode) {
        // For protected EPKs, check if user has authentication
        if (epkData.visibilidad === 'protegido_password' && epkData.password_hash) {
          const hasAuth = sessionStorage.getItem(`epk_auth_${epkSlug}`);
          if (!hasAuth) {
            // Redirect to password page
            window.location.href = `/epk/${epkSlug}/password`;
            return;
          }
        }
        
        // For private EPKs, only allow direct access (not indexed)
        if (epkData.visibilidad === 'privado' && !epkData.acceso_directo) {
          setError('EPK privado - acceso no permitido');
          return;
        }
      }

      // Parse JSON fields safely
      const parsedEPK: EPKData = {
        ...epkData,
        tour_manager: parseContactInfo(epkData.tour_manager),
        tour_production: parseContactInfo(epkData.tour_production),
        coordinadora_booking: parseContactInfo(epkData.coordinadora_booking),
        management: parseContactInfo(epkData.management),
        booking: parseContactInfo(epkData.booking),
        etiquetas: epkData.etiquetas || []
      };

      setEPK(parsedEPK);

      // Fetch related media
      const [photosResult, videosResult, audiosResult, documentsResult] = await Promise.all([
        supabase.from('epk_fotos').select('*').eq('epk_id', epkData.id).order('orden'),
        supabase.from('epk_videos').select('*').eq('epk_id', epkData.id).eq('privado', false).order('orden'),
        supabase.from('epk_audios').select('*').eq('epk_id', epkData.id).order('orden'),
        supabase.from('epk_documentos').select('*').eq('epk_id', epkData.id).order('orden')
      ]);

      if (photosResult.data) setPhotos(photosResult.data);
      if (videosResult.data) setVideos(videosResult.data);
      if (audiosResult.data) setAudios(audiosResult.data);
      if (documentsResult.data) setDocuments(documentsResult.data);

      // Track view
      if (epkData.rastrear_analiticas) {
        incrementView(epkSlug);
      }

    } catch (error) {
      console.error('Error fetching EPK:', error);
      setError('Error al cargar el EPK');
    } finally {
      setLoading(false);
    }
  };

  const parseContactInfo = (jsonData: any) => {
    if (typeof jsonData === 'object' && jsonData !== null) {
      return {
        nombre: jsonData.nombre || '',
        email: jsonData.email || '',
        telefono: jsonData.telefono || '',
        whatsapp: jsonData.whatsapp || '',
        mostrar: jsonData.mostrar || false
      };
    }
    return {
      nombre: '',
      email: '',
      telefono: '',
      whatsapp: '',
      mostrar: false
    };
  };

  const incrementView = async (epkSlug: string) => {
    try {
      await supabase.rpc('increment_epk_view', {
        epk_slug: epkSlug,
        visitor_ip: null,
        is_unique: false
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleDownload = async (url: string, filename: string, resource?: string) => {
    try {
      if (epk?.rastrear_analiticas && epk.slug) {
        await supabase.rpc('increment_epk_download', {
          epk_slug: epk.slug,
          recurso: resource || filename
        });
      }
      
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: t('epk.downloadStarted'),
        description: `${t('common.download')} ${filename}`
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: t('common.error'),
        description: t('epk.downloadError'),
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!epk?.permitir_zip || photos.length === 0) return;
    
    // Check rate limiting
    const userIdentifier = `${epk.slug}_${Date.now().toString().slice(0, -6)}`; // Hour-based identifier
    const rateLimitCheck = rateLimiter.canDownload(userIdentifier);
    
    if (!rateLimitCheck.allowed) {
      const timeLeft = Math.ceil((rateLimitCheck.timeLeft || 0) / (1000 * 60)); // minutes
      toast({
        title: t('epk.rateLimitExceeded'),
        description: `${t('epk.rateLimitMessage')} ${timeLeft} ${t('common.minutes', 'minutos')}.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Record the download attempt
      const downloadRecorded = rateLimiter.recordDownload(userIdentifier);
      if (!downloadRecorded) {
        toast({
          title: t('epk.rateLimitExceeded'),
          description: t('epk.rateLimitMessage'),
          variant: "destructive"
        });
        return;
      }

      toast({
        title: t('epk.preparingZip'),
        description: t('epk.zipDescription')
      });
      
      // In a real implementation, you would call a backend service to create a ZIP
      // For now, we'll simulate the process
      
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast({
        title: t('common.error'),
        description: t('epk.downloadError'),
        variant: "destructive"
      });
    }
  };

  const generateVCard = (contacts: any[]) => {
    const vCardData = contacts.map(contact => {
      if (!contact.data?.mostrar) return '';
      
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contact.data.nombre || contact.role}`,
        `TITLE:${contact.role}`,
        ...(contact.data.email ? [`EMAIL:${contact.data.email}`] : []),
        ...(contact.data.telefono ? [`TEL:${contact.data.telefono}`] : []),
        'END:VCARD'
      ];
      
      return lines.join('\n');
    }).filter(Boolean);
    
    return vCardData.join('\n\n');
  };

  const downloadContactsVCard = () => {
    const contacts = [
      { role: 'Tour Manager', data: epk?.tour_manager },
      { role: 'Tour Production', data: epk?.tour_production },
      { role: 'Coordinadora de Booking', data: epk?.coordinadora_booking },
      { role: 'Management', data: epk?.management },
      { role: 'Booking', data: epk?.booking }
    ].filter(contact => contact.data?.mostrar);

    if (contacts.length === 0) return;

    const vCardContent = generateVCard(contacts);
    const blob = new Blob([vCardContent], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${epk?.artista_proyecto || 'contactos'}_contactos.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Contactos descargados",
      description: "Se ha descargado el archivo de contactos (.vcf)"
    });
  };

  const renderContactInfo = (contact: any, label: string) => {
    if (!contact?.mostrar && !contact?.nombre && !contact?.email && !contact?.telefono) return null;

    return (
      <Card className="card-moodita">
        <CardContent className="p-6">
          <h4 className="font-semibold text-lg mb-4 text-gradient-primary">{label}</h4>
          <div className="space-y-4">
            {contact.nombre && (
              <p className="text-foreground font-medium">{contact.nombre}</p>
            )}
            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`mailto:${contact.email}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`tel:${contact.telefono}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {contact.telefono}
                  </a>
                </div>
              )}
              {contact.whatsapp && (
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getVideoThumbnail = (video: EPKVideo) => {
    if (video.tipo === 'youtube' && video.video_id) {
      return `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
    }
    if (video.tipo === 'vimeo' && video.video_id) {
      return `https://vumbnail.com/${video.video_id}.jpg`;
    }
    return null;
  };

  const getVideoEmbedUrl = (video: EPKVideo) => {
    if (video.tipo === 'youtube' && video.video_id) {
      return `https://www.youtube.com/embed/${video.video_id}`;
    }
    if (video.tipo === 'vimeo' && video.video_id) {
      return `https://player.vimeo.com/video/${video.video_id}`;
    }
    return video.url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-primary animate-spin flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-background"></div>
          </div>
          <p className="text-muted-foreground">Cargando EPK...</p>
        </div>
      </div>
    );
  }

  if (error || !epk) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">EPK no encontrado</h1>
          <p className="text-muted-foreground">
            {error || 'Este EPK no existe o no está disponible públicamente.'}
          </p>
        </div>
      </div>
    );
  }

  const epkTheme = epk.tema || 'auto';
  const isDark = epkTheme === 'oscuro' || (epkTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <>
      <Helmet>
        <title>{epk.titulo} - {epk.artista_proyecto} | Electronic Press Kit</title>
        <meta name="description" content={epk.tagline || epk.bio_corta?.substring(0, 160) || `Electronic Press Kit para ${epk.artista_proyecto}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${epk.titulo} - ${epk.artista_proyecto}`} />
        <meta property="og:description" content={epk.tagline || epk.bio_corta?.substring(0, 160) || `Electronic Press Kit para ${epk.artista_proyecto}`} />
        {epk.imagen_portada && <meta property="og:image" content={epk.imagen_portada} />}
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${epk.titulo} - ${epk.artista_proyecto}`} />
        <meta name="twitter:description" content={epk.tagline || epk.bio_corta?.substring(0, 160) || `Electronic Press Kit para ${epk.artista_proyecto}`} />
        {epk.imagen_portada && <meta name="twitter:image" content={epk.imagen_portada} />}
        
        {/* SEO - Dynamic robots meta based on visibility */}
        <meta name="robots" content={
          epk.visibilidad === 'publico' && !isGuestMode 
            ? "index, follow" 
            : "noindex, nofollow"
        } />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className={cn("min-h-screen bg-background transition-colors duration-300", themeHook.resolvedTheme === 'dark' ? "dark" : "")}>
        {/* Header with Theme Toggle */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={themeHook.toggleTheme}
            className="bg-background/80 backdrop-blur-sm border-border/50"
          >
            {themeHook.resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : themeHook.resolvedTheme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Header */}
        <header className="relative overflow-hidden">{""}
          <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
          <div className="relative container-moodita py-16 lg:py-24">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
              {epk.imagen_portada && (
                <div className="w-48 h-48 mx-auto rounded-full overflow-hidden shadow-large ring-4 ring-primary/20">
                  <img 
                    src={epk.imagen_portada} 
                    alt={`Imagen de ${epk.artista_proyecto}`}
                    className="w-full h-full object-cover hover-lift"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-bold text-gradient-hero tracking-tight">
                  {epk.titulo}
                </h1>
                <h2 className="text-2xl lg:text-3xl text-muted-foreground font-light">
                  {epk.artista_proyecto}
                </h2>
                {epk.tagline && (
                  <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                    {epk.tagline}
                  </p>
                )}
              </div>

              {epk.etiquetas && epk.etiquetas.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3">
                  {epk.etiquetas.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-4 py-2 text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4 pt-8">
                {epk.nota_prensa_pdf && (
                  <Button 
                    size="lg" 
                    className="btn-primary"
                    onClick={() => handleDownload(epk.nota_prensa_pdf!, `${epk.artista_proyecto}_Press_Kit.pdf`, 'nota_prensa')}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Descargar Nota de Prensa
                  </Button>
                )}
                
                {photos.length > 0 && epk.permitir_zip && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={handleDownloadAll}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Descargar Fotos (ZIP)
                  </Button>
                )}
                
                {epk.permitir_zip && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => toast({
                      title: "Preparando Press Kit completo",
                      description: "Se está preparando el kit completo para descarga"
                    })}
                  >
                    <FileDown className="w-5 h-5 mr-2" />
                    Descargar Press Kit
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container-moodita space-y-16 pb-24">
          {/* Bio */}
          {epk.bio_corta && (
            <section className="section-spacing">
              <Card className="card-moodita">
                <CardContent className="p-8 lg:p-12">
                  <h3 className="text-3xl font-bold mb-8 text-center text-gradient-primary">
                    Biografía
                  </h3>
                  <div className="prose prose-lg max-w-none text-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed text-center lg:text-left">
                      {epk.bio_corta}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Photos Gallery */}
          {photos.length > 0 && (
            <section className="section-spacing">
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold mb-4 text-gradient-primary">
                  Galería de Fotos
                </h3>
                <div className="flex justify-center">
                  {epk.permitir_zip && (
                    <Button variant="outline" onClick={handleDownloadAll}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar todas las fotos
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo, index) => (
                  <Card 
                    key={photo.id || index} 
                    className="card-interactive group overflow-hidden"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.titulo || `Foto ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      {photo.descargable && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(photo.url, photo.titulo || `foto_${index + 1}.jpg`, 'foto');
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {photo.titulo && (
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-center truncate">{photo.titulo}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <section className="section-spacing">
              <h3 className="text-3xl font-bold mb-12 text-center text-gradient-primary">
                Videos
              </h3>
              <div className="grid gap-8 lg:gap-12">
                {videos.map((video, index) => (
                  <Card key={video.id || index} className="card-moodita overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-video bg-muted relative">
                        <EmbedErrorBoundary
                          embedType={video.tipo as any}
                          embedUrl={getVideoEmbedUrl(video)}
                          className="w-full h-full"
                        >
                          {getVideoEmbedUrl(video) ? (
                            <iframe
                              src={getVideoEmbedUrl(video)}
                              title={video.titulo}
                              className="w-full h-full"
                              allowFullScreen
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}
                        </EmbedErrorBoundary>
                      </div>
                      <div className="p-6">
                        <h4 className="font-semibold text-lg mb-2">{video.titulo}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{video.tipo}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Audio */}
          {audios.length > 0 && (
            <section className="section-spacing">
              <h3 className="text-3xl font-bold mb-12 text-center text-gradient-primary">
                Audio
              </h3>
              <div className="space-y-4 max-w-3xl mx-auto">
                {audios.map((audio, index) => (
                  <Card key={audio.id || index} className="card-moodita">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Button size="lg" className="flex-shrink-0 rounded-full">
                          <Play className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{audio.titulo}</h4>
                          <p className="text-sm text-muted-foreground">Audio track</p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={audio.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <section className="section-spacing">
              <h3 className="text-3xl font-bold mb-12 text-center text-gradient-primary">
                Documentos
              </h3>
              <div className="space-y-4 max-w-3xl mx-auto">
                {documents.map((doc, index) => (
                  <Card key={doc.id || index} className="card-interactive">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <FileText className="w-10 h-10 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{doc.titulo}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {doc.tipo && <span className="capitalize">{doc.tipo}</span>}
                            {doc.file_type && <span>• {doc.file_type.toUpperCase()}</span>}
                            {doc.file_size && <span>• {Math.round(doc.file_size / 1024)} KB</span>}
                          </div>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => handleDownload(doc.url, doc.titulo, 'documento')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Contacts */}
          {(epk.tour_manager?.mostrar || epk.tour_production?.mostrar || epk.coordinadora_booking?.mostrar || epk.management?.mostrar || epk.booking?.mostrar ||
            epk.tour_manager?.nombre || epk.tour_production?.nombre || epk.coordinadora_booking?.nombre || epk.management?.nombre || epk.booking?.nombre) && (
            <section className="section-spacing">
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold mb-6 text-gradient-primary">
                  Contactos
                </h3>
                <Button 
                  variant="outline"
                  onClick={downloadContactsVCard}
                  className="mb-8"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar contactos (.vcf)
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
                {renderContactInfo(epk.tour_manager, 'Tour Manager')}
                {renderContactInfo(epk.tour_production, 'Tour Production')}
                {renderContactInfo(epk.coordinadora_booking, 'Coordinadora de Booking')}
                {renderContactInfo(epk.management, 'Management')}
                {renderContactInfo(epk.booking, 'Booking')}
              </div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/30">
          <div className="container-moodita py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Electronic Press Kit • {new Date().getFullYear()}
            </p>
            {epk.rastrear_analiticas && (
              <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                <span>Vistas: {epk.vistas_totales || 0}</span>
                <span>Descargas: {epk.descargas_totales || 0}</span>
              </div>
            )}
          </div>
        </footer>

        {/* Photo Lightbox */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-7xl max-h-full">
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.titulo || 'Foto'}
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(null);
                }}
              >
                ✕
              </Button>
              {selectedPhoto.descargable && (
                <Button
                  variant="secondary"
                  className="absolute bottom-4 right-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(selectedPhoto.url, selectedPhoto.titulo || 'foto.jpg', 'foto');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};