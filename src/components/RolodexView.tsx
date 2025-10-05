import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Mail, Phone, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  category: string;
  city?: string;
  country?: string;
  notes?: string;
  field_config: any;
}

interface RolodexViewProps {
  contacts: Contact[];
  onClose: () => void;
}

export function RolodexView({ contacts, onClose }: RolodexViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const wheelTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleNext = () => {
    setDirection('next');
    setCurrentIndex((prev) => (prev + 1) % contacts.length);
  };

  const handlePrev = () => {
    setDirection('prev');
    setCurrentIndex((prev) => (prev - 1 + contacts.length) % contacts.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') onClose();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }

    // Debounce wheel events to prevent rapid scrolling
    wheelTimeoutRef.current = setTimeout(() => {
      if (e.deltaY > 0) {
        handleNext();
      } else if (e.deltaY < 0) {
        handlePrev();
      }
    }, 50);
  };

  if (contacts.length === 0) return null;

  const currentContact = contacts[currentIndex];
  const displayName = currentContact.stage_name || currentContact.name;
  const firstLetter = displayName.charAt(0).toUpperCase();

  // Get visible cards for stack effect
  const getVisibleCards = () => {
    const visible = [];
    for (let i = 0; i < Math.min(5, contacts.length); i++) {
      const index = (currentIndex + i) % contacts.length;
      visible.push({
        contact: contacts[index],
        offset: i,
      });
    }
    return visible;
  };

  return (
    <div
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-2xl">
        {/* Navigation Info */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} de {contacts.length} contactos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Usa ← → para navegar
          </p>
        </div>

        {/* Card Stack */}
        <div className="relative h-[500px] flex items-center justify-center perspective-1000">
          {getVisibleCards().map(({ contact, offset }) => (
            <div
              key={contact.id}
              className={cn(
                "absolute w-full max-w-md transition-all duration-500 ease-out",
                offset === 0 && "z-10",
                offset > 0 && "pointer-events-none"
              )}
              style={{
                transform: `
                  translateY(${offset * 8}px)
                  translateX(${offset * 4}px)
                  rotateX(${offset * -2}deg)
                  scale(${1 - offset * 0.05})
                `,
                opacity: offset > 3 ? 0 : 1 - offset * 0.2,
                zIndex: 50 - offset,
              }}
            >
              {/* Business Card */}
              <div className="bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden">
                {/* Card Header with gradient */}
                <div className="h-3 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                
                <div className="p-8 space-y-6">
                  {/* Name Section */}
                  <div className="border-b pb-4">
                    <h2 className="text-3xl font-bold text-foreground">
                      {displayName}
                    </h2>
                    {contact.stage_name && contact.name !== contact.stage_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {contact.name}
                      </p>
                    )}
                  </div>

                  {/* Role & Company */}
                  <div className="space-y-2">
                    {contact.role && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          {contact.role}
                        </Badge>
                      </div>
                    )}
                    {contact.company && contact.field_config?.company && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">{contact.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 pt-2">
                    {contact.email && contact.field_config?.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm hover:text-primary transition-colors truncate"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && contact.field_config?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-sm hover:text-primary transition-colors"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.city && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {contact.city}{contact.country && `, ${contact.country}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {contact.notes && contact.field_config?.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground italic">
                        {contact.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="h-2 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            variant="outline"
            onClick={handlePrev}
            className="rounded-full w-14 h-14"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="px-6 py-2 bg-muted rounded-full">
            <span className="text-sm font-medium">
              {firstLetter}
            </span>
          </div>

          <Button
            size="lg"
            variant="outline"
            onClick={handleNext}
            className="rounded-full w-14 h-14"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Quick Jump Indicator */}
        <div className="flex justify-center gap-1 mt-6">
          {contacts.slice(0, Math.min(20, contacts.length)).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 'next' : 'prev');
                setCurrentIndex(idx);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-primary w-8"
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
          {contacts.length > 20 && (
            <span className="text-xs text-muted-foreground ml-2">
              +{contacts.length - 20}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
