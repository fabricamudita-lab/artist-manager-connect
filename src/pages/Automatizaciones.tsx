import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, Clock, User, Megaphone, ChevronDown, Zap, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { AUTOMATION_MODULES, NOTIFY_ROLE_OPTIONS, CHANNEL_OPTIONS, AUTOMATIONS } from '@/lib/automationDefinitions';
import { useAutomationConfigs } from '@/hooks/useAutomationConfigs';
import { toast } from '@/hooks/use-toast';

export default function Automatizaciones() {
  const { configs, isLoading, upsertConfig, enableAllRecommended, activeCount, totalCount } = useAutomationConfigs();
  const [activeTab, setActiveTab] = useState('booking');

  const handleToggle = (key: string, enabled: boolean) => {
    upsertConfig.mutate({ automation_key: key, is_enabled: enabled });
  };

  const handleFieldChange = (key: string, field: string, value: unknown) => {
    upsertConfig.mutate({ automation_key: key, [field]: value } as any);
  };

  const handleEnableAll = () => {
    enableAllRecommended.mutate(undefined, {
      onSuccess: () => toast({ title: 'Automatizaciones recomendadas activadas' }),
    });
  };

  const moduleConfigs = configs.filter(c => c.module === activeTab);

  // Group by category within the module
  const categories = [...new Set(moduleConfigs.map(c => c.category))];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-playfair flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Automatizaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los workflows de tu equipo según las mejores prácticas de la industria
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {activeCount} de {totalCount} activas
          </Badge>
          <Button size="sm" onClick={handleEnableAll} disabled={enableAllRecommended.isPending}>
            <Sparkles className="w-4 h-4 mr-1" />
            Activar recomendadas
          </Button>
        </div>
      </div>

      {/* Tabs by module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {AUTOMATION_MODULES.map(mod => {
            const count = configs.filter(c => c.module === mod.id && c.is_enabled).length;
            const total = AUTOMATIONS.filter(a => a.module === mod.id).length;
            return (
              <TabsTrigger key={mod.id} value={mod.id} className="gap-1.5">
                <mod.icon className="w-4 h-4" />
                {mod.label}
                {count > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/20 text-primary rounded-full px-1.5">
                    {count}/{total}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {AUTOMATION_MODULES.map(mod => (
          <TabsContent key={mod.id} value={mod.id} className="space-y-6 mt-4">
            {configs.filter(c => c.module === mod.id).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <mod.icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay automatizaciones disponibles para este módulo todavía.</p>
              </div>
            ) : (
              [...new Set(configs.filter(c => c.module === mod.id).map(c => c.category))].map(cat => (
                <div key={cat} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
                  <div className="grid gap-3">
                    {configs.filter(c => c.module === mod.id && c.category === cat).map(auto => (
                      <AutomationCard
                        key={auto.key}
                        automation={auto}
                        onToggle={handleToggle}
                        onFieldChange={handleFieldChange}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface AutomationCardProps {
  automation: ReturnType<typeof useAutomationConfigs>['configs'][number];
  onToggle: (key: string, enabled: boolean) => void;
  onFieldChange: (key: string, field: string, value: unknown) => void;
}

function AutomationCard({ automation: a, onToggle, onFieldChange }: AutomationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`transition-opacity ${!a.is_enabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Title + Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{a.title}</h4>
              {a.recommended && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  Recomendada
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
          </div>
          <Switch
            checked={a.is_enabled}
            onCheckedChange={(v) => onToggle(a.key, v)}
          />
        </div>

        {/* Row 2: Quick config (always visible) */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Trigger timing */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{a.trigger_days === null ? 'Inmediato' : `${a.trigger_days} días`}</span>
          </div>

          {/* Notify role */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>{NOTIFY_ROLE_OPTIONS.find(r => r.value === a.notify_role)?.label || a.notify_role}</span>
          </div>

          {/* Channel */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{CHANNEL_OPTIONS.find(c => c.value === a.notify_channel)?.label || a.notify_channel}</span>
          </div>
        </div>

        {/* Industry tip */}
        {a.industryTip && (
          <div className="flex items-start gap-2 bg-primary/5 rounded-md px-3 py-2 text-xs text-primary">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{a.industryTip}</span>
          </div>
        )}

        {/* Expandable config */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-center text-xs h-7 text-muted-foreground">
              <ChevronDown className={`w-3.5 h-3.5 mr-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ocultar' : 'Configuración avanzada'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Trigger days */}
              {a.defaultTriggerDays !== null && a.triggerDaysRange && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días de espera</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      min={a.triggerDaysRange[0]}
                      max={a.triggerDaysRange[1]}
                      step={1}
                      value={[a.trigger_days ?? a.defaultTriggerDays]}
                      onValueChange={([v]) => onFieldChange(a.key, 'trigger_days', v)}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">{a.trigger_days ?? a.defaultTriggerDays}d</span>
                  </div>
                </div>
              )}

              {/* Notify role */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notificar a</label>
                <Select
                  value={a.notify_role}
                  onValueChange={(v) => onFieldChange(a.key, 'notify_role', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFY_ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Canal</label>
                <Select
                  value={a.notify_channel}
                  onValueChange={(v) => onFieldChange(a.key, 'notify_channel', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
