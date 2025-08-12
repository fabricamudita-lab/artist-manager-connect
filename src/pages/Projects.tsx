import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Folder } from "lucide-react";

export default function Projects() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("todos");

  // SEO: title, meta, canonical
  useEffect(() => {
    document.title = "Proyectos | MOODITA";
    const description = "Gestión centralizada de proyectos: presupuestos, documentos, contratos y solicitudes vinculadas.";

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  // Placeholder data (hasta conectar con Supabase)
  const items = useMemo(
    () => [],
    []
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nuevo proyecto
          </Button>
        </div>
      </header>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vista general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative md:w-1/2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o artista"
                  className="pl-9"
                />
              </div>
              <div className="md:w-56">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="en_curso">En curso</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="archivado">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista simple (placeholder) */}
            {items.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground border rounded-lg p-6">
                <Folder className="w-5 h-5" />
                Aún no hay proyectos. Crea el primero con "Nuevo proyecto".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* map de proyectos cuando haya datos */}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="resumen">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
            <TabsTrigger value="notas">Notas internas</TabsTrigger>
          </TabsList>
          <TabsContent value="resumen" className="text-sm text-muted-foreground">
            Selecciona un proyecto para ver su resumen.
          </TabsContent>
          <TabsContent value="presupuestos" className="text-sm text-muted-foreground">
            Presupuestos del proyecto seleccionado.
          </TabsContent>
          <TabsContent value="documentos" className="text-sm text-muted-foreground">
            Documentos del proyecto seleccionado.
          </TabsContent>
          <TabsContent value="contratos" className="text-sm text-muted-foreground">
            Contratos del proyecto seleccionado.
          </TabsContent>
          <TabsContent value="solicitudes" className="text-sm text-muted-foreground">
            Solicitudes asociadas al proyecto seleccionado.
          </TabsContent>
          <TabsContent value="notas" className="text-sm text-muted-foreground">
            Notas internas del proyecto seleccionado.
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
