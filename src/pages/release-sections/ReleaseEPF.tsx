import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Plus, FileText, Download, Eye, Trash2, Search, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRelease, useReleaseAssets, useUploadReleaseAsset, useDeleteReleaseAsset, useUpdateReleaseAsset, ReleaseAsset } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAlertHighlight } from '@/hooks/useAlertHighlight';
import { toast } from 'sonner';

const DOC_CATEGORIES = [
  'Nota de prensa',
  'Bio',
  'Rider',
  'Hoja técnica',
  'Otro',
] as const;

type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export default function ReleaseEPF() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: assets, isLoading: loadingAssets } = useReleaseAssets(id);
  const uploadAsset = useUploadReleaseAsset();
  const deleteAsset = useDeleteReleaseAsset();
  const updateAsset = useUpdateReleaseAsset();
  const { alertId, highlightElement } = useAlertHighlight();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBtnRef = useRef<HTMLButtonElement>(null);
  const uploadBtnEmptyRef = useRef<HTMLButtonElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');

  // Edit dialog
  const [editDoc, setEditDoc] = useState<ReleaseAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (alertId === 'epf-empty') {
      setTimeout(() => {
        if (uploadBtnRef.current) highlightElement(uploadBtnRef.current);
        if (uploadBtnEmptyRef.current) highlightElement(uploadBtnEmptyRef.current);
      }, 400);
    }
  }, [alertId, highlightElement]);

  const documents = useMemo(() => {
    let docs = (assets || []).filter((a) => a.type === 'document');

    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(q));
    }

    if (categoryFilter && categoryFilter !== 'all') {
      docs = docs.filter((d) => d.category === categoryFilter);
    }

    docs.sort((a, b) => {
      switch (sortMode) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return docs;
  }, [assets, search, categoryFilter, sortMode]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      await uploadAsset.mutateAsync({
        file,
        releaseId: id,
        type: 'document',
        title: file.name,
        category: 'Otro',
      });
    } catch {
      // error handled by hook
    }
    e.target.value = '';
  };

  const handleDelete = (doc: ReleaseAsset) => {
    deleteAsset.mutate(doc);
  };

  const openEditDialog = (doc: ReleaseAsset) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category || '');
    setEditDescription(doc.description || '');
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    await updateAsset.mutateAsync({
      id: editDoc.id,
      release_id: editDoc.release_id,
      title: editTitle,
      category: editCategory || null as any,
      description: editDescription || null as any,
    });
    setEditDoc(null);
  };

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv,.ppt,.pptx,.pages,.numbers,.key,.zip,.rar"
        onChange={handleFileChange}
      />

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
          <Button size="sm" ref={uploadBtnRef} onClick={handleUploadClick} disabled={uploadAsset.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {uploadAsset.isPending ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Más reciente</SelectItem>
                <SelectItem value="date-asc">Más antiguo</SelectItem>
                <SelectItem value="name-asc">Nombre A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(doc)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.file_url, '_blank')} title="Ver">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Descargar"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = doc.file_url;
                      a.download = doc.title;
                      a.target = '_blank';
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(doc)}
                    title="Eliminar"
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
              <Button ref={uploadBtnEmptyRef} onClick={handleUploadClick} disabled={uploadAsset.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {uploadAsset.isPending ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={updateAsset.isPending}>
              {updateAsset.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
