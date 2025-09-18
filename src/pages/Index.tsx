import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, Calendar, MessageCircle, FileText, DollarSign, Users, Star, Zap, Crown, Gamepad2 } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/5 relative overflow-hidden scan-lines">
      {/* Gaming Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      {/* Hero Section - Gaming Style */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            {/* Gaming Logo */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-primary rounded-full flex items-center justify-center animate-glow-pulse">
                <Music className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Star className="w-8 h-8 text-warning animate-spin-slow" />
              </div>
            </div>

            {/* Game Title */}
            <h1 className="text-6xl md:text-8xl font-bold text-gradient-hero mb-6 animate-level-up">
              MOODITA
              <span className="block text-4xl md:text-5xl mt-2 text-primary">GAMING EDITION</span>
            </h1>

            {/* Gaming Subtitle */}
            <div className="mb-8 space-y-4">
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                🎮 <strong>La primera plataforma musical gamificada</strong> 🎮
              </p>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explora cada función como un nivel único. Gana XP, desbloquea logros 
                y conviértete en el maestro de tu carrera musical.
              </p>
            </div>

            {/* Gaming Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Button asChild size="lg" className="game-button text-lg px-8 py-4 rounded-2xl">
                <Link to="/auth">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  ¡Iniciar Aventura!
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 rounded-2xl border-2 hover:bg-primary/10">
                <Link to="/auth">
                  <Crown className="w-5 h-5 mr-2" />
                  Continuar Partida
                </Link>
              </Button>
            </div>

            {/* Game Stats Preview */}
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                <span>Sistema XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-success" />
                <span>Logros</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-accent" />
                <span>Rankings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Levels Section */}
      <div className="py-24 bg-card/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gradient-hero mb-4">
              🎯 Niveles de Juego
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cada función es un nivel único con desafíos, recompensas y progresión
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Level 1 - Calendar */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-primary">Cronos Musical</h3>
                <p className="text-muted-foreground mb-4">
                  Domina el tiempo de tus eventos
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">150 XP</span>
                </div>
              </div>
            </div>

            {/* Level 2 - Projects */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <Music className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-secondary">Laboratorio Creativo</h3>
                <p className="text-muted-foreground mb-4">
                  Gestiona proyectos como un maestro
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">200 XP</span>
                </div>
              </div>
            </div>

            {/* Level 3 - Communication */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-accent">Red de Comunicación</h3>
                <p className="text-muted-foreground mb-4">
                  Conecta con tu equipo en tiempo real
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">120 XP</span>
                </div>
              </div>
            </div>

            {/* Level 4 - Finance */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-primary">Tesorería Digital</h3>
                <p className="text-muted-foreground mb-4">
                  Administra finanzas como un experto
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">250 XP</span>
                </div>
              </div>
            </div>

            {/* Level 5 - Documents */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-secondary">Archivo Quantum</h3>
                <p className="text-muted-foreground mb-4">
                  Almacén digital supremo
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">130 XP</span>
                </div>
              </div>
            </div>

            {/* Level 6 - Bookings */}
            <div className="group relative">
              <div className="pixel-border text-center p-8 rounded-2xl bg-gradient-card hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-glow-pulse">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gradient-accent">Portal de Oportunidades</h3>
                <p className="text-muted-foreground mb-4">
                  Gestiona bookings como un pro
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-bold">180 XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gaming CTA Section */}
      <div className="py-24 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-6 h-6 border-2 border-primary/20 rounded"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-8">
            <Crown className="w-16 h-16 text-warning mx-auto mb-6 animate-bounce-gentle" />
            <h2 className="text-4xl font-bold text-gradient-hero mb-4">
              ¿Listo para la Aventura Musical Definitiva?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              🎮 Únete al primer ecosistema musical gamificado del mundo.<br/>
              Gana XP, desbloquea logros y conviértete en una leyenda musical.
            </p>
          </div>

          <div className="space-y-6">
            <Button asChild size="lg" className="game-button text-xl px-12 py-6 rounded-2xl">
              <Link to="/auth">
                <Star className="w-6 h-6 mr-3" />
                ¡Comenzar la Aventura Gratis!
                <Zap className="w-6 h-6 ml-3" />
              </Link>
            </Button>
            
            <p className="text-sm text-muted-foreground">
              ⚡ Sin límites de tiempo • 🎯 Progresión ilimitada • 🏆 Recompensas épicas
            </p>
          </div>
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
