import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Zap, Star, CheckCircle } from 'lucide-react';

interface GameTransitionProps {
  children: React.ReactNode;
}

export const GameTransition: React.FC<GameTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Level names mapping
  const levelNames: Record<string, string> = {
    '/dashboard': 'Hub Central',
    '/calendar': 'Cronos Musical',
    '/projects': 'Laboratorio Creativo',
    '/chat': 'Red de Comunicación',
    '/budgets': 'Tesorería Digital',
    '/solicitudes': 'Portal de Oportunidades',
    '/documents': 'Archivo Quantum',
    '/auth': 'Portal de Acceso',
  };

  const getCurrentLevelName = () => {
    const path = location.pathname;
    return levelNames[path] || 'Zona Desconocida';
  };

  useEffect(() => {
    setIsTransitioning(true);
    setProgress(0);

    // Simulate loading with progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 100);

    // Complete transition
    const transitionTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsTransitioning(false);
        // Occasional level up celebration
        if (Math.random() > 0.8) {
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 3000);
        }
      }, 300);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(transitionTimer);
    };
  }, [location.pathname]);

  if (isTransitioning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-primary/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center space-y-8">
          {/* Loading Icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center animate-spin-slow">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-primary/30 rounded-full animate-pulse" />
          </div>

          {/* Level Name */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gradient-hero">
              Cargando {getCurrentLevelName()}
            </h2>
            <p className="text-muted-foreground">Preparando tu experiencia gaming...</p>
          </div>

          {/* Progress Bar */}
          <div className="w-80 mx-auto space-y-2">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sincronizando...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Loading Tips */}
          <div className="max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Completa acciones para ganar XP y desbloquear recompensas
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {children}
      
      {/* Level Up Notification */}
      {showLevelUp && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-gradient-primary text-white p-4 rounded-2xl shadow-glow max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">¡Level Up!</h3>
                <p className="text-sm text-white/80">Has ganado +50 XP</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};