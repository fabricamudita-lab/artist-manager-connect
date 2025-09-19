export type SupportedLanguage = 'es' | 'ca' | 'en';

interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

const translations: Record<SupportedLanguage, TranslationStrings> = {
  es: {
    common: {
      loading: 'Cargando...',
      error: 'Error',
      retry: 'Reintentar',
      download: 'Descargar',
      close: 'Cerrar',
      cancel: 'Cancelar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      create: 'Crear',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      yes: 'Sí',
      no: 'No',
      ok: 'OK'
    },
    epk: {
      title: 'Electronic Press Kit',
      biography: 'Biografía',
      photos: 'Fotos',
      videos: 'Videos',
      audio: 'Audio',
      documents: 'Documentos',
      contacts: 'Contactos',
      downloadPressKit: 'Descargar Kit de Prensa',
      downloadPhotos: 'Descargar Fotos (ZIP)',
      downloadContacts: 'Descargar Contactos',
      notFound: 'EPK no encontrado',
      expired: 'Este EPK ha expirado y ya no está disponible',
      private: 'EPK privado - acceso no permitido',
      downloadStarted: 'Descarga iniciada',
      downloadError: 'No se pudo descargar el archivo',
      preparingZip: 'Preparando descarga',
      zipDescription: 'Se está preparando el archivo ZIP con todas las fotos',
      contactsDownloaded: 'Contactos descargados',
      contactsDescription: 'Se ha descargado el archivo de contactos (.vcf)',
      rateLimitExceeded: 'Límite de descargas excedido',
      rateLimitMessage: 'Has alcanzado el límite de descargas. Inténtalo más tarde.',
      embedError: 'Contenido no disponible',
      maxRetries: 'Máximo de reintentos alcanzado'
    },
    embed: {
      errors: {
        youtube: {
          private: 'Este video de YouTube es privado o está restringido',
          deleted: 'Este video de YouTube ha sido eliminado o no existe',
          network: 'Error de conexión al cargar el video de YouTube',
          timeout: 'El video de YouTube tardó demasiado en cargar',
          unavailable: 'Video de YouTube no disponible en tu región',
          unknown: 'Error desconocido al cargar el video de YouTube'
        },
        vimeo: {
          private: 'Este video de Vimeo es privado o no está disponible públicamente',
          deleted: 'Este video de Vimeo ha sido eliminado o no existe',
          network: 'Error de conexión al cargar el video de Vimeo',
          timeout: 'El video de Vimeo tardó demasiado en cargar',
          unavailable: 'Video de Vimeo no disponible en tu región',
          unknown: 'Error desconocido al cargar el video de Vimeo'
        },
        spotify: {
          private: 'Este contenido de Spotify no está disponible públicamente',
          deleted: 'Este contenido de Spotify ha sido eliminado',
          network: 'Error de conexión al cargar el contenido de Spotify',
          timeout: 'El contenido de Spotify tardó demasiado en cargar',
          unavailable: 'Contenido de Spotify no disponible en tu región',
          unknown: 'Error desconocido al cargar el contenido de Spotify'
        },
        generic: {
          private: 'Este contenido es privado o no está disponible públicamente',
          deleted: 'Este contenido ha sido eliminado o no existe',
          network: 'Error de conexión al cargar el contenido',
          timeout: 'El contenido tardó demasiado en cargar',
          unavailable: 'Contenido no disponible en tu región',
          unknown: 'Error desconocido al cargar el contenido'
        }
      }
    },
    theme: {
      light: 'Claro',
      dark: 'Oscuro',
      auto: 'Automático',
      toggle: 'Cambiar tema'
    }
  },
  ca: {
    common: {
      loading: 'Carregant...',
      error: 'Error',
      retry: 'Tornar a intentar',
      download: 'Descarregar',
      close: 'Tancar',
      cancel: 'Cancel·lar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      create: 'Crear',
      back: 'Tornar',
      next: 'Següent',
      previous: 'Anterior',
      yes: 'Sí',
      no: 'No',
      ok: 'D\'acord'
    },
    epk: {
      title: 'Electronic Press Kit',
      biography: 'Biografia',
      photos: 'Fotos',
      videos: 'Vídeos',
      audio: 'Àudio',
      documents: 'Documents',
      contacts: 'Contactes',
      downloadPressKit: 'Descarregar Kit de Premsa',
      downloadPhotos: 'Descarregar Fotos (ZIP)',
      downloadContacts: 'Descarregar Contactes',
      notFound: 'EPK no trobat',
      expired: 'Aquest EPK ha caducat i ja no està disponible',
      private: 'EPK privat - accés no permès',
      downloadStarted: 'Descàrrega iniciada',
      downloadError: 'No s\'ha pogut descarregar l\'arxiu',
      preparingZip: 'Preparant descàrrega',
      zipDescription: 'S\'està preparant l\'arxiu ZIP amb totes les fotos',
      contactsDownloaded: 'Contactes descarregats',
      contactsDescription: 'S\'ha descarregat l\'arxiu de contactes (.vcf)',
      rateLimitExceeded: 'Límit de descàrregues excedit',
      rateLimitMessage: 'Has arribat al límit de descàrregues. Torna-ho a intentar més tard.',
      embedError: 'Contingut no disponible',
      maxRetries: 'Màxim de reintents assolit'
    },
    embed: {
      errors: {
        youtube: {
          private: 'Aquest vídeo de YouTube és privat o està restringit',
          deleted: 'Aquest vídeo de YouTube ha estat eliminat o no existeix',
          network: 'Error de connexió en carregar el vídeo de YouTube',
          timeout: 'El vídeo de YouTube ha trigat massa a carregar',
          unavailable: 'Vídeo de YouTube no disponible a la teva regió',
          unknown: 'Error desconegut en carregar el vídeo de YouTube'
        },
        vimeo: {
          private: 'Aquest vídeo de Vimeo és privat o no està disponible públicament',
          deleted: 'Aquest vídeo de Vimeo ha estat eliminat o no existeix',
          network: 'Error de connexió en carregar el vídeo de Vimeo',
          timeout: 'El vídeo de Vimeo ha trigat massa a carregar',
          unavailable: 'Vídeo de Vimeo no disponible a la teva regió',
          unknown: 'Error desconegut en carregar el vídeo de Vimeo'
        },
        spotify: {
          private: 'Aquest contingut de Spotify no està disponible públicament',
          deleted: 'Aquest contingut de Spotify ha estat eliminat',
          network: 'Error de connexió en carregar el contingut de Spotify',
          timeout: 'El contingut de Spotify ha trigat massa a carregar',
          unavailable: 'Contingut de Spotify no disponible a la teva regió',
          unknown: 'Error desconegut en carregar el contingut de Spotify'
        },
        generic: {
          private: 'Aquest contingut és privat o no està disponible públicament',
          deleted: 'Aquest contingut ha estat eliminat o no existeix',
          network: 'Error de connexió en carregar el contingut',
          timeout: 'El contingut ha trigat massa a carregar',
          unavailable: 'Contingut no disponible a la teva regió',
          unknown: 'Error desconegut en carregar el contingut'
        }
      }
    },
    theme: {
      light: 'Clar',
      dark: 'Fosc',
      auto: 'Automàtic',
      toggle: 'Canviar tema'
    }
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      download: 'Download',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      ok: 'OK'
    },
    epk: {
      title: 'Electronic Press Kit',
      biography: 'Biography',
      photos: 'Photos',
      videos: 'Videos',
      audio: 'Audio',
      documents: 'Documents',
      contacts: 'Contacts',
      downloadPressKit: 'Download Press Kit',
      downloadPhotos: 'Download Photos (ZIP)',
      downloadContacts: 'Download Contacts',
      notFound: 'EPK not found',
      expired: 'This EPK has expired and is no longer available',
      private: 'Private EPK - access not allowed',
      downloadStarted: 'Download started',
      downloadError: 'Could not download file',
      preparingZip: 'Preparing download',
      zipDescription: 'ZIP file with all photos is being prepared',
      contactsDownloaded: 'Contacts downloaded',
      contactsDescription: 'Contacts file (.vcf) has been downloaded',
      rateLimitExceeded: 'Download limit exceeded',
      rateLimitMessage: 'You have reached the download limit. Please try again later.',
      embedError: 'Content not available',
      maxRetries: 'Maximum retries reached'
    },
    embed: {
      errors: {
        youtube: {
          private: 'This YouTube video is private or restricted',
          deleted: 'This YouTube video has been deleted or does not exist',
          network: 'Connection error loading YouTube video',
          timeout: 'YouTube video took too long to load',
          unavailable: 'YouTube video not available in your region',
          unknown: 'Unknown error loading YouTube video'
        },
        vimeo: {
          private: 'This Vimeo video is private or not publicly available',
          deleted: 'This Vimeo video has been deleted or does not exist',
          network: 'Connection error loading Vimeo video',
          timeout: 'Vimeo video took too long to load',
          unavailable: 'Vimeo video not available in your region',
          unknown: 'Unknown error loading Vimeo video'
        },
        spotify: {
          private: 'This Spotify content is not publicly available',
          deleted: 'This Spotify content has been deleted',
          network: 'Connection error loading Spotify content',
          timeout: 'Spotify content took too long to load',
          unavailable: 'Spotify content not available in your region',
          unknown: 'Unknown error loading Spotify content'
        },
        generic: {
          private: 'This content is private or not publicly available',
          deleted: 'This content has been deleted or does not exist',
          network: 'Connection error loading content',
          timeout: 'Content took too long to load',
          unavailable: 'Content not available in your region',
          unknown: 'Unknown error loading content'
        }
      }
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      auto: 'Auto',
      toggle: 'Toggle theme'
    }
  }
};

export const useI18n = (language: SupportedLanguage = 'es') => {
  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Spanish if key not found
        let fallbackValue: any = translations.es;
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
            fallbackValue = fallbackValue[fk];
          } else {
            return fallback || key;
          }
        }
        return typeof fallbackValue === 'string' ? fallbackValue : (fallback || key);
      }
    }
    
    return typeof value === 'string' ? value : (fallback || key);
  };

  const getAvailableLanguages = (): { code: SupportedLanguage; name: string }[] => {
    return [
      { code: 'es', name: 'Español' },
      { code: 'ca', name: 'Català' },
      { code: 'en', name: 'English' }
    ];
  };

  const detectLanguage = (): SupportedLanguage => {
    const browserLang = navigator.language.toLowerCase();
    
    if (browserLang.startsWith('ca')) return 'ca';
    if (browserLang.startsWith('en')) return 'en';
    return 'es'; // Default to Spanish
  };

  const formatDate = (date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string => {
    const d = new Date(date);
    
    const locales = {
      es: 'es-ES',
      ca: 'ca-ES',
      en: 'en-US'
    };

    if (format === 'relative') {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t('common.today', 'Hoy');
      if (diffDays === 1) return t('common.yesterday', 'Ayer');
      if (diffDays < 7) return `${diffDays} ${t('common.daysAgo', 'días')}`;
    }

    const options: Intl.DateTimeFormatOptions = format === 'long'
      ? { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      : { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        };

    return d.toLocaleDateString(locales[language], options);
  };

  const formatNumber = (num: number, style: 'decimal' | 'currency' | 'percent' = 'decimal'): string => {
    const locales = {
      es: 'es-ES',
      ca: 'ca-ES',
      en: 'en-US'
    };

    const options: Intl.NumberFormatOptions = { style };
    if (style === 'currency') {
      options.currency = 'EUR';
    }

    return num.toLocaleString(locales[language], options);
  };

  return {
    t,
    language,
    getAvailableLanguages,
    detectLanguage,
    formatDate,
    formatNumber,
    translations: translations[language]
  };
};