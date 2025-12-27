import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  venue?: string;
  city?: string;
  country?: string;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  venue = "",
  city = "",
  country = "",
  placeholder = "Buscar dirección...",
  className = "",
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const debouncedInput = useDebounce(inputValue, 300);
  const debouncedVenue = useDebounce(venue, 500);
  const debouncedCity = useDebounce(city, 500);
  const debouncedCountry = useDebounce(country, 500);

  const searchAddresses = useCallback(async (query: string) => {
    if (!query && !debouncedVenue && !debouncedCity) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
        body: {
          query,
          venue: debouncedVenue,
          city: debouncedCity,
          country: debouncedCountry,
        },
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      if (data.predictions?.length > 0) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedVenue, debouncedCity, debouncedCountry]);

  // Search when input changes
  useEffect(() => {
    if (debouncedInput.length >= 2 || (debouncedVenue && debouncedCity)) {
      searchAddresses(debouncedInput);
    } else {
      setPredictions([]);
    }
  }, [debouncedInput, searchAddresses]);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setOpen(false);
    setPredictions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!newValue) {
      onChange("");
    }
  };

  const handleInputBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
      setOpen(false);
    }, 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setOpen(true)}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={`pl-10 ${className}`}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandList>
            {predictions.length === 0 && !isLoading && (
              <CommandEmpty>
                {inputValue.length >= 2 
                  ? "No se encontraron direcciones" 
                  : "Escribe para buscar direcciones..."}
              </CommandEmpty>
            )}
            <CommandGroup>
              {predictions.map((prediction) => (
                <CommandItem
                  key={prediction.placeId}
                  value={prediction.description}
                  onSelect={() => handleSelect(prediction)}
                  className="cursor-pointer"
                >
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{prediction.mainText}</span>
                    <span className="text-xs text-muted-foreground">{prediction.secondaryText}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
