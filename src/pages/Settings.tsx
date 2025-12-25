import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Shield, Palette, Globe } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-playfair">Ajustes</h1>
        <p className="text-muted-foreground mt-1">
          Configura las preferencias de tu cuenta
        </p>
      </div>

      <div className="grid gap-6">
        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo quieres recibir las notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe actualizaciones importantes por correo
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones push</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe alertas en tiempo real
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacidad
            </CardTitle>
            <CardDescription>
              Gestiona tu privacidad y seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Perfil público</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que otros usuarios vean tu perfil
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de dos factores</Label>
                <p className="text-sm text-muted-foreground">
                  Añade una capa extra de seguridad
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza la apariencia de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo oscuro</Label>
                <p className="text-sm text-muted-foreground">
                  Cambia entre tema claro y oscuro
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Idioma y región
            </CardTitle>
            <CardDescription>
              Configura tu idioma y zona horaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <p className="text-sm text-muted-foreground">Español (España)</p>
              </div>
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <p className="text-sm text-muted-foreground">Europe/Madrid (UTC+1)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
