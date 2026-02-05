import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DraggableMemberCard } from './DraggableMemberCard';
import { MemberType } from './TeamMemberCard';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  type: MemberType;
  currentCategory?: string;
  rawData?: any;
}

interface TeamMemberFreeCanvasProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberEdit?: (member: Member) => void;
  onMemberRemove?: (member: Member) => void;
  onMemberEditRole?: (member: Member) => void;
  onCategoryChange?: (memberId: string, newCategory: string) => void;
  categories?: Array<{ value: string; label: string }>;
  showActions?: boolean;
  /** Context key to separate position storage (e.g., artistId or 'all') */
  contextKey?: string;
}

const STORAGE_KEY_PREFIX = 'team_member_positions';
const CARD_WIDTH = 120;
const CARD_HEIGHT = 100;
const GRID_COLS = 6;
const GRID_PADDING = 20;
const GRID_GAP = 16;
const MIN_CANVAS_WIDTH = 1200;
const MIN_CANVAS_HEIGHT = 600;
const CANVAS_EXPAND_BUFFER = 200; // Extra space beyond the furthest element

// Get storage key for a specific context
const getStorageKey = (contextKey: string) => `${STORAGE_KEY_PREFIX}_${contextKey}`;

// Load positions from localStorage for a specific context
const loadPositions = (contextKey: string): Record<string, Position> => {
  try {
    const stored = localStorage.getItem(getStorageKey(contextKey));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save positions to localStorage for a specific context
const savePosition = (contextKey: string, memberId: string, position: Position) => {
  const stored = loadPositions(contextKey);
  stored[memberId] = position;
  localStorage.setItem(getStorageKey(contextKey), JSON.stringify(stored));
};

// Clear all positions from localStorage for a specific context
const clearAllPositions = (contextKey: string) => {
  localStorage.removeItem(getStorageKey(contextKey));
};

// Calculate initial grid position for a member without saved position
const calculateInitialPosition = (index: number): Position => {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  
  return {
    x: GRID_PADDING + col * (CARD_WIDTH + GRID_GAP),
    y: GRID_PADDING + row * (CARD_HEIGHT + GRID_GAP),
  };
};

export function TeamMemberFreeCanvas({
  members,
  onMemberClick,
  onMemberEdit,
  onMemberRemove,
  onMemberEditRole,
  onCategoryChange,
  categories = [],
  showActions = true,
  contextKey = 'default',
}: TeamMemberFreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  
  // Load saved positions on mount and calculate initial positions for new members
  useEffect(() => {
    const savedPositions = loadPositions(contextKey);
    const newPositions: Record<string, Position> = {};
    
    members.forEach((member, index) => {
      if (savedPositions[member.id]) {
        newPositions[member.id] = savedPositions[member.id];
      } else {
        // Calculate grid position for new members
        const position = calculateInitialPosition(index);
        newPositions[member.id] = position;
        // Save the initial position
        savePosition(contextKey, member.id, position);
      }
    });
    
    setPositions(newPositions);
  }, [members, contextKey]);

  // Handle position change from drag
  const handlePositionChange = (memberId: string, position: Position) => {
    setPositions(prev => ({
      ...prev,
      [memberId]: position,
    }));
    savePosition(contextKey, memberId, position);
  };

  // Reset all positions to grid
  const handleResetPositions = () => {
    clearAllPositions(contextKey);
    const newPositions: Record<string, Position> = {};
    
    members.forEach((member, index) => {
      const position = calculateInitialPosition(index);
      newPositions[member.id] = position;
      savePosition(contextKey, member.id, position);
    });
    
    setPositions(newPositions);
  };

  // Calculate canvas dimensions based on member positions (dynamic expansion)
  const canvasDimensions = useMemo(() => {
    if (Object.keys(positions).length === 0) {
      const rows = Math.ceil(members.length / GRID_COLS);
      return {
        width: MIN_CANVAS_WIDTH,
        height: Math.max(MIN_CANVAS_HEIGHT, rows * (CARD_HEIGHT + GRID_GAP) + GRID_PADDING * 2),
      };
    }
    
    const maxX = Math.max(...Object.values(positions).map(p => p.x));
    const maxY = Math.max(...Object.values(positions).map(p => p.y));
    
    return {
      width: Math.max(MIN_CANVAS_WIDTH, maxX + CARD_WIDTH + CANVAS_EXPAND_BUFFER),
      height: Math.max(MIN_CANVAS_HEIGHT, maxY + CARD_HEIGHT + CANVAS_EXPAND_BUFFER),
    };
  }, [positions, members.length]);

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetPositions}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reorganizar
        </Button>
      </div>
      
      {/* Scrollable Canvas Container */}
      <div 
        className="overflow-auto border rounded-lg bg-muted/20" 
        style={{ 
          maxHeight: '70vh',
          overscrollBehavior: 'contain',
        }}
        onWheel={(e) => {
          // Prevent browser back navigation on horizontal scroll
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
          }
        }}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ 
            width: canvasDimensions.width,
            height: canvasDimensions.height,
            backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
        {members.map((member) => {
          const position = positions[member.id] || { x: 0, y: 0 };
          
          return (
            <DraggableMemberCard
              key={member.id}
              id={member.id}
              name={member.name}
              email={member.email}
              role={member.role}
              avatarUrl={member.avatarUrl}
              type={member.type}
              position={position}
              onPositionChange={(pos) => handlePositionChange(member.id, pos)}
              onClick={() => onMemberClick?.(member)}
              onEdit={() => onMemberEdit?.(member)}
              onRemove={() => onMemberRemove?.(member)}
              onEditRole={() => onMemberEditRole?.(member)}
              onCategoryChange={onCategoryChange ? (cat) => onCategoryChange(member.id, cat) : undefined}
              categories={categories}
              currentCategory={member.currentCategory}
              showActions={showActions}
              containerRef={containerRef}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}
