import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, Calendar, MessageCircle, FileText, DollarSign, Users } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950 dark:via-gray-900 dark:to-indigo-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <Music className="h-16 w-16 text-primary mx-auto mb-8" />
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              MOODITA APP
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              La plataforma completa de gestión musical que conecta artistas y management. 
              Gestiona solicitudes, calendario, finanzas y comunicación en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link to="/auth">Comenzar Ahora</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                <Link to="/auth">Iniciar Sesión</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Funcionalidades Principales
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diseñado específicamente para las necesidades del sector musical
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gestión de Calendario</h3>
              <p className="text-muted-foreground">
                Organiza conciertos, sesiones de grabación y eventos importantes
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Comunicación Directa</h3>
              <p className="text-muted-foreground">
                Chat interno y sistema de notificaciones en tiempo real
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Reportes Financieros</h3>
              <p className="text-muted-foreground">
                Seguimiento de royalties, ventas y merchandising
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gestión de Documentos</h3>
              <p className="text-muted-foreground">
                Almacena contratos, fotos, videos y material promocional
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Solicitudes de Booking</h3>
              <p className="text-muted-foreground">
                Gestiona ofertas de conciertos y entrevistas de manera eficiente
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card border shadow-sm">
              <Music className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Panel Personalizado</h3>
              <p className="text-muted-foreground">
                Interfaz diferenciada para artistas y equipos de management
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            ¿Listo para revolucionar tu gestión musical?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Únete a MOODITA APP y lleva tu carrera musical al siguiente nivel
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link to="/auth">Registrarse Gratis</Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              © 2024 MOODITA APP. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
