

# Plan: Ocultar porcentajes en la pestaña Créditos

## Problema Actual

En el diálogo "Ver créditos" de la sección Audio, la pestaña **Créditos** muestra los porcentajes (20%, 25%, etc.) junto a cada colaborador. Esta información es redundante porque los porcentajes ya se muestran de forma detallada en la pestaña **Derechos**, divididos por tipo (Derechos de Autor y Royalties Master).

## Solución

Eliminar el Badge de porcentaje de la pestaña Créditos. La pestaña quedara enfocada solo en mostrar el nombre y rol de cada colaborador.

## Cambios Tecnicos

### Archivo: `src/pages/release-sections/ReleaseAudio.tsx`

Eliminar las lineas 525-527 que muestran el porcentaje:

**Antes:**
```tsx
<div className="flex-1">
  <p className="font-medium">{credit.name}</p>
  <p className="text-sm text-muted-foreground">{credit.role}</p>
</div>
{credit.percentage && (
  <Badge variant="secondary">{credit.percentage}%</Badge>
)}
```

**Despues:**
```tsx
<div className="flex-1">
  <p className="font-medium">{credit.name}</p>
  <p className="text-sm text-muted-foreground">{credit.role}</p>
</div>
```

## Resultado Visual

La pestaña Creditos mostrara:

| Antes | Despues |
|-------|---------|
| Vic Mirallas - productor - **20%** | Vic Mirallas - productor |
| Infarto Producciones - sello - **20%** | Infarto Producciones - sello |
| Vic Mirallas - letrista - **25%** | Vic Mirallas - letrista |
| Yarea Guillen - letrista - **25%** | Yarea Guillen - letrista |

Los porcentajes seguiran visibles en la pestaña Derechos, organizados por tipo (Derechos de Autor y Royalties Master).

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/release-sections/ReleaseAudio.tsx` | Eliminar Badge de porcentaje en la pestaña Creditos |

