import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConfetti } from '@/hooks/useConfetti';
import { 
  Music, 
  Calendar, 
  MessageCircle, 
  FileText, 
  DollarSign, 
  Users, 
  Star,
  Lock,
  CheckCircle,
  Sparkles,
  Map,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GameLevel {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  unlocked: boolean;
  completed: boolean;
  xp: number;
  position: { x: number; y: number };
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'core' | 'advanced' | 'premium';
}

export const GameMap = () => {
  const { profile } = useAuth();
  const { fireConfetti } = useConfetti();
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);

  // Game levels configuration
  const gameLevels: GameLevel[] = [
    {
      id: 'dashboard',
      name: 'Hub Central',
      description: 'Tu base de operaciones musical',
      icon: Star,
      path: '/dashboard',
      unlocked: true,
      completed: !!profile,
      xp: 100,
      position: { x: 50, y: 50 },
      difficulty: 'easy',
      category: 'core'
    },
    {
      id: 'calendar',
      name: 'Cronos Musical',
      description: 'Controla el tiempo de tus eventos',
      icon: Calendar,
      path: '/calendar',
      unlocked: !!profile,
      completed: false,
      xp: 150,
      position: { x: 25, y: 30 },
      difficulty: 'easy',
      category: 'core'
    },
    {
      id: 'projects',
      name: 'Laboratorio Creativo',
      description: 'Gestiona tus proyectos musicales',
      icon: Music,
      path: '/projects',
      unlocked: !!profile,
      completed: false,
      xp: 200,
      position: { x: 75, y: 30 },
      difficulty: 'medium',
      category: 'core'
    },
    {
      id: 'chat',
      name: 'Red de Comunicación',
      description: 'Conecta con tu equipo',
      icon: MessageCircle,
      path: '/chat',
      unlocked: !!profile,
      completed: false,
      xp: 120,
      position: { x: 20, y: 70 },
      difficulty: 'easy',
      category: 'core'
    },
    {
      id: 'budgets',
      name: 'Tesorería Digital',
      description: 'Administra tus finanzas',
      icon: DollarSign,
      path: '/budgets',
      unlocked: !!profile,
      completed: false,
      xp: 250,
      position: { x: 80, y: 70 },
      difficulty: 'hard',
      category: 'advanced'
    },
    {
      id: 'solicitudes',
      name: 'Portal de Oportunidades',
      description: 'Gestiona solicitudes y bookings',
      icon: Users,
      path: '/solicitudes',
      unlocked: !!profile,
      completed: false,
      xp: 180,
      position: { x: 50, y: 85 },
      difficulty: 'medium',
      category: 'core'
    },
    {
      id: 'documents',
      name: 'Archivo Quantum',
      description: 'Almacén digital de documentos',
      icon: FileText,
      path: '/documents',
      unlocked: !!profile,
      completed: false,
      xp: 130,
      position: { x: 15, y: 50 },
      difficulty: 'easy',
      category: 'advanced'
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-success border-success/30 bg-success/10';
      case 'medium': return 'text-warning border-warning/30 bg-warning/10';
      case 'hard': return 'text-destructive border-destructive/30 bg-destructive/10';
      default: return 'text-muted-foreground border-border bg-muted/10';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'text-primary border-primary/30 bg-primary/10';
      case 'advanced': return 'text-secondary border-secondary/30 bg-secondary/10';
      case 'premium': return 'text-accent border-accent/30 bg-accent/10';
      default: return 'text-muted-foreground border-border bg-muted/10';
    }
  };

  const handleLevelClick = (level: GameLevel) => {
    if (!level.unlocked) {
      // Play lock sound effect here
      return;
    }
    
    setSelectedLevel(level.id);
    if (Math.random() > 0.7) { // 30% chance for reward
      setShowReward(true);
      fireConfetti();
      setTimeout(() => setShowReward(false), 2000);
    }
  };

  const totalXP = gameLevels.reduce((acc, level) => 
    acc + (level.completed ? level.xp : 0), 0
  );

  const completedLevels = gameLevels.filter(level => level.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Game HUD */}
      <div className="fixed top-6 left-6 right-6 z-50 flex justify-between items-start">
        <Card className="game-hud p-4 bg-card/90 backdrop-blur-md border-primary/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <span className="font-bold text-lg">{totalXP}</span>
              <span className="text-sm text-muted-foreground">XP</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-bold">{completedLevels}</span>
              <span className="text-sm text-muted-foreground">/ {gameLevels.length}</span>
            </div>
          </div>
        </Card>

        {profile && (
          <Card className="game-profile p-4 bg-card/90 backdrop-blur-md border-secondary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.active_role === 'artist' ? 'Artista' : 'Manager'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Game Map */}
      <div className="relative min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-6">
          {/* Map Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Map className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-gradient-hero">Mapa de Aventuras MOODITA</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explora cada sección como un nivel único. Completa objetivos, gana XP y desbloquea nuevas áreas.
            </p>
          </div>

          {/* Interactive Game Map */}
          <div className="relative w-full h-[600px] mx-auto bg-gradient-to-br from-card/50 to-muted/30 rounded-3xl border border-border/50 overflow-hidden">
            {/* Map Background Pattern */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 25px 25px, hsl(var(--primary)) 2px, transparent 0)`,
                backgroundSize: '50px 50px'
              }}
            />

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {gameLevels.map((level, index) => {
                if (index === 0) return null;
                const prevLevel = gameLevels[0]; // Connect all to central hub
                return (
                  <line
                    key={`line-${level.id}`}
                    x1={`${prevLevel.position.x}%`}
                    y1={`${prevLevel.position.y}%`}
                    x2={`${level.position.x}%`}
                    y2={`${level.position.y}%`}
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    strokeDasharray={level.unlocked ? "0" : "8,4"}
                    className="transition-all duration-500"
                    opacity={level.unlocked ? 0.6 : 0.3}
                  />
                );
              })}
            </svg>

            {/* Game Levels */}
            {gameLevels.map((level) => {
              const Icon = level.icon;
              const isHovered = hoveredLevel === level.id;
              const isSelected = selectedLevel === level.id;

              return (
                <div
                  key={level.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                  style={{
                    left: `${level.position.x}%`,
                    top: `${level.position.y}%`,
                    transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`
                  }}
                  onMouseEnter={() => setHoveredLevel(level.id)}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  {/* Level Node */}
                  <div className="relative">
                    {level.unlocked ? (
                      <Link to={level.path}>
                        <Button
                          variant="outline"
                          size="lg"
                          className={`
                            relative w-16 h-16 rounded-full p-0 border-2 transition-all duration-300
                            ${level.completed 
                              ? 'bg-success border-success text-success-foreground shadow-glow hover:shadow-large' 
                              : 'bg-card border-primary/50 hover:border-primary hover:shadow-medium'
                            }
                            ${isSelected ? 'animate-pulse ring-2 ring-primary ring-offset-2' : ''}
                          `}
                          onClick={() => handleLevelClick(level)}
                        >
                          <Icon className={`w-7 h-7 ${level.completed ? '' : 'text-primary'}`} />
                          {level.completed && (
                            <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-success bg-background rounded-full" />
                          )}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-16 h-16 rounded-full p-0 border-2 border-muted bg-muted/50 cursor-not-allowed"
                        disabled
                      >
                        <Lock className="w-7 h-7 text-muted-foreground" />
                      </Button>
                    )}

                    {/* Level Info Card */}
                    {isHovered && (
                      <Card className="absolute top-20 left-1/2 transform -translate-x-1/2 w-64 p-4 bg-card/95 backdrop-blur-md border-primary/20 shadow-large animate-scale-in z-10">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm">{level.name}</h3>
                            <Badge className={getDifficultyColor(level.difficulty)}>
                              {level.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{level.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-warning" />
                              <span>{level.xp} XP</span>
                            </div>
                            <Badge className={getCategoryColor(level.category)}>
                              {level.category}
                            </Badge>
                          </div>
                          {!level.unlocked && (
                            <div className="text-xs text-destructive font-medium">
                              🔒 Completa niveles anteriores
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Game Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-primary text-white">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{totalXP}</p>
                  <p className="text-white/80">Experiencia Total</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-secondary text-white">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{completedLevels}</p>
                  <p className="text-white/80">Niveles Completados</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-accent text-white">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{Math.round((completedLevels / gameLevels.length) * 100)}%</p>
                  <p className="text-white/80">Progreso General</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Reward Notification */}
      {showReward && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-scale-in bg-success text-success-foreground px-8 py-4 rounded-2xl shadow-glow">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <span className="font-bold text-lg">¡Recompensa desbloqueada!</span>
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};