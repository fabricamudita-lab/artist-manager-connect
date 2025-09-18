import React, { useState, useEffect } from 'react';
import { useConfetti } from '@/hooks/useConfetti';
import { useGameSound } from '@/hooks/useGameSound';
import { 
  Star, 
  Zap, 
  Trophy, 
  Gift, 
  Sparkles, 
  CheckCircle,
  Diamond,
  Crown
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Reward {
  id: string;
  type: 'xp' | 'achievement' | 'badge' | 'unlock';
  title: string;
  description: string;
  value: number;
  icon: React.ComponentType<any>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GameRewardsProps {
  trigger?: string; // Trigger event
  onRewardClaimed?: (reward: Reward) => void;
}

export const GameRewards: React.FC<GameRewardsProps> = ({ trigger, onRewardClaimed }) => {
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [rewardQueue, setRewardQueue] = useState<Reward[]>([]);
  const { fireConfetti, fireCelebration } = useConfetti();
  const { playSuccess, playLevelUp, playPowerUp } = useGameSound();

  // Predefined rewards
  const availableRewards: Reward[] = [
    {
      id: 'first-login',
      type: 'xp',
      title: '¡Bienvenido a MOODITA!',
      description: 'Has iniciado tu aventura musical',
      value: 50,
      icon: Star,
      rarity: 'common'
    },
    {
      id: 'project-created',
      type: 'achievement',
      title: 'Maestro Creativo',
      description: 'Creaste tu primer proyecto',
      value: 100,
      icon: Trophy,
      rarity: 'rare'
    },
    {
      id: 'calendar-used',
      type: 'badge',
      title: 'Organizador Temporal',
      description: 'Usaste el calendario por primera vez',
      value: 75,
      icon: CheckCircle,
      rarity: 'common'
    },
    {
      id: 'budget-mastery',
      type: 'unlock',
      title: 'Gurú Financiero',
      description: 'Dominaste la gestión financiera',
      value: 200,
      icon: Crown,
      rarity: 'epic'
    },
    {
      id: 'communication-expert',
      type: 'achievement',
      title: 'Comunicador Experto',
      description: 'Enviaste 10 mensajes',
      value: 150,
      icon: Diamond,
      rarity: 'rare'
    }
  ];

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-success/50 bg-success/5 text-success';
      case 'rare': return 'border-primary/50 bg-primary/5 text-primary';
      case 'epic': return 'border-secondary/50 bg-secondary/5 text-secondary';
      case 'legendary': return 'border-accent/50 bg-accent/5 text-accent';
      default: return 'border-muted';
    }
  };

  const triggerReward = (rewardId?: string) => {
    let reward: Reward;
    
    if (rewardId) {
      reward = availableRewards.find(r => r.id === rewardId) || availableRewards[0];
    } else {
      // Random reward based on trigger or random
      reward = availableRewards[Math.floor(Math.random() * availableRewards.length)];
    }

    setRewardQueue(prev => [...prev, reward]);
  };

  // Process reward queue
  useEffect(() => {
    if (rewardQueue.length > 0 && !showReward) {
      const nextReward = rewardQueue[0];
      setCurrentReward(nextReward);
      setShowReward(true);
      setRewardQueue(prev => prev.slice(1));

      // Play appropriate sound
      switch (nextReward.rarity) {
        case 'legendary':
          playLevelUp();
          fireCelebration();
          break;
        case 'epic':
          playPowerUp();
          fireCelebration();
          break;
        default:
          playSuccess();
          fireConfetti();
          break;
      }
    }
  }, [rewardQueue, showReward, playSuccess, playLevelUp, playPowerUp, fireConfetti, fireCelebration]);

  // Handle trigger changes
  useEffect(() => {
    if (trigger) {
      triggerReward(trigger);
    }
  }, [trigger]);

  const claimReward = () => {
    if (currentReward) {
      onRewardClaimed?.(currentReward);
      setShowReward(false);
      setTimeout(() => setCurrentReward(null), 300);
    }
  };

  // Expose triggerReward globally for other components
  useEffect(() => {
    (window as any).triggerGameReward = triggerReward;
    return () => {
      delete (window as any).triggerGameReward;
    };
  }, []);

  if (!showReward || !currentReward) return null;

  const Icon = currentReward.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <Card className={`
        max-w-md w-full mx-4 p-8 text-center animate-scale-in
        ${getRarityStyle(currentReward.rarity)}
        border-2 shadow-glow
      `}>
        {/* Rarity Badge */}
        <Badge 
          className={`
            absolute -top-3 left-1/2 transform -translate-x-1/2
            ${getRarityStyle(currentReward.rarity)}
            font-bold uppercase tracking-wider
          `}
        >
          {currentReward.rarity}
        </Badge>

        {/* Reward Icon */}
        <div className={`
          w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
          ${getRarityStyle(currentReward.rarity)}
          animate-pulse-soft
        `}>
          <Icon className="w-10 h-10" />
        </div>

        {/* Reward Content */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            {currentReward.title}
          </h2>
          
          <p className="text-muted-foreground">
            {currentReward.description}
          </p>

          {/* Value Display */}
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            <span className="text-xl font-bold">+{currentReward.value} XP</span>
          </div>

          {/* Type Badge */}
          <Badge variant="outline" className="capitalize">
            {currentReward.type}
          </Badge>
        </div>

        {/* Claim Button */}
        <button
          onClick={claimReward}
          className="
            mt-8 w-full py-3 px-6 rounded-xl font-bold text-lg
            bg-gradient-primary text-white
            hover:scale-105 transition-all duration-200
            shadow-medium hover:shadow-glow
          "
        >
          <div className="flex items-center justify-center gap-2">
            <Gift className="w-5 h-5" />
            ¡Reclamar Recompensa!
          </div>
        </button>

        {/* Sparkle Effects */}
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-6 h-6 text-accent animate-spin-slow" />
        </div>
        <div className="absolute -bottom-2 -left-2">
          <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
        </div>
      </Card>
    </div>
  );
};