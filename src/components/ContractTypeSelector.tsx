import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileSignature } from 'lucide-react';
import { ContractGenerator } from '@/components/ContractGenerator';
import { IPContractGenerator } from '@/components/IPContractGenerator';

interface ContractTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfUrl?: string }) => void | Promise<void>;
  bookingData?: {
    artista?: string;
    ciudad?: string;
    venue?: string;
    fecha?: string;
    hora?: string;
    fee?: number;
    aforo?: number;
    duracion?: string;
    promotor?: string;
    formato?: string;
    festival_ciclo?: string;
  };
  /** Hide booking contract option (e.g. when in release context) */
  hideBooking?: boolean;
  /** Context: 'booking' or 'release' */
  context?: 'booking' | 'release';
}

type SelectedType = null | 'booking' | 'ip';

export const ContractTypeSelector: React.FC<ContractTypeSelectorProps> = ({
  open,
  onOpenChange,
  onSave,
  bookingData,
  hideBooking = false,
  context = 'booking',
}) => {
  const [selectedType, setSelectedType] = useState<SelectedType>(null);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedType(null);
    }
    onOpenChange(v);
  };

  // If a sub-generator is open, render it directly
  if (selectedType === 'booking') {
    return (
      <ContractGenerator
        open={open}
        onOpenChange={(v) => {
          if (!v) setSelectedType(null);
          handleClose(v);
        }}
        onSave={onSave}
        bookingData={bookingData}
      />
    );
  }

  if (selectedType === 'ip') {
    return (
      <IPContractGenerator
        open={open}
        onOpenChange={(v) => {
          if (!v) setSelectedType(null);
          handleClose(v);
        }}
        onSave={onSave}
      />
    );
  }

  // Show the selector
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Seleccionar tipo de contrato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {!hideBooking && (
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedType('booking')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Contrato de Booking</p>
                  <p className="text-sm text-muted-foreground">
                    Contrato con promotor para actuación pública de artista
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedType('ip')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                <FileSignature className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Cesión de Derechos / IP</p>
                <p className="text-sm text-muted-foreground">
                  Master Recording Collaboration Agreement — royalties y propiedad intelectual
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
