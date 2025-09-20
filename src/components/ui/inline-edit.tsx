import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
  displayComponent?: (value: string) => React.ReactNode;
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  className,
  multiline = false,
  disabled = false,
  displayComponent
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setEditValue(value);
    setOriginalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    if (editValue === originalValue || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
      setOriginalValue(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
      setEditValue(originalValue); // Rollback
      toast({
        title: "Error",
        description: "No se pudo guardar el cambio",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editValue, originalValue, onSave, isSaving]);

  const debouncedSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(handleSave, 500);
  }, [handleSave]);

  useEffect(() => {
    if (isEditing && editValue !== originalValue && !isSaving) {
      debouncedSave();
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [editValue, originalValue, isEditing, isSaving, debouncedSave]);

  const handleCancel = () => {
    setEditValue(originalValue);
    setIsEditing(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <span className={className}>
        {displayComponent ? displayComponent(value) : value || placeholder}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div 
        className={cn(
          "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors min-h-[32px] flex items-center",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        {displayComponent ? displayComponent(value) : (value || (
          <span className="text-muted-foreground italic">{placeholder}</span>
        ))}
      </div>
    );
  }

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className={cn("relative", className)}>
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder={placeholder}
        className={cn(
          "min-h-[32px]",
          multiline && "min-h-[80px] resize-none"
        )}
        disabled={isSaving}
      />
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}