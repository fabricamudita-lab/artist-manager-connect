import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Download, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRelease, useReleaseAssets } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReleaseEPF() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: assets, isLoading: loadingAssets } = useReleaseAssets(id);

  const documents = assets?.filter((a) => a.type === 'document') || [];

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
          <h1 className="text-2xl font-bold">Electronic Press Folder</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documentos de Prensa</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAssets ? (
            <Skeleton className="h-32 w-full" />
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'PPP', { locale: es })}
                    </p>
                  </div>
                  {doc.category && (
                    <Badge variant="outline">{doc.category}</Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin documentos</h3>
              <p className="text-muted-foreground mb-4">
                Sube notas de prensa, bios y otros documentos
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Subir Documento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
