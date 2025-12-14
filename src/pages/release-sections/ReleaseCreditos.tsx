import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelease, useTracks } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ReleaseCreditos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Créditos</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créditos por Canción</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTracks ? (
            <Skeleton className="h-32 w-full" />
          ) : tracks && tracks.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {tracks.map((track) => (
                <AccordionItem key={track.id} value={track.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">{track.track_number}.</span>
                      <span>{track.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-9 space-y-3">
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir Crédito
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Sin créditos registrados para esta canción.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Primero añade canciones en la sección de Audio para gestionar sus créditos.
              </p>
              <Button variant="link" onClick={() => navigate(`/releases/${id}/audio`)}>
                Ir a Audio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
