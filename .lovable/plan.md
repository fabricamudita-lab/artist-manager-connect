

## Overhaul del Contrato: Nivel Profesional + Branding MOODITA

Comparacion exhaustiva del contrato original de CityZen vs el generado por la app. Se han identificado **problemas criticos** y clausulas faltantes organizadas por prioridad.

### Problema critico: Roles invertidos

En `contractTemplates.ts` linea 110-112, el Agente se presenta como "EL PROMOTOR" y el Promotor como "EL AGENTE". Esto invalida todo el contrato. Se corregira inmediatamente.

### Cambios por archivo

---

**1. `src/components/ContractGenerator.tsx`** - Logo + PDF

- Reemplazar `import cityzenLogo from "@/assets/cityzen-logo.png"` por `import mooditaLogo from "@/assets/moodita-logo.png"`
- Actualizar `addLogo()` para usar `mooditaLogo` en lugar de `cityzenLogo`
- En el texto del header de cada pagina, mostrar "MOODITA" en vez de "CITYZEN MUSIC"

---

**2. `src/lib/contractTemplates.ts`** - Clausulas completas del contrato original

**2a. Corregir roles (BUG CRITICO)**
- Linea 110: El agente debe presentarse como "EL AGENTE" (no "EL PROMOTOR")
- Linea 112: El promotor debe presentarse como "EL PROMOTOR" (no "EL AGENTE")

**2b. Interfaz `LegalClauses` - Nuevas clausulas**

Agregar los siguientes campos a la interfaz:

| Campo | Descripcion |
|---|---|
| `contratoFirme` | Primer pago + 7 dias sin objecion = acuerdo vinculante |
| `impagoPenalizacion` | Impago = derecho a cancelar + 100% cache + gastos |
| `noAnunciarSinPago` | Prohibido anunciar antes del primer pago |
| `segurosIndemnidad` | RC obligatoria + prueba seguro + indemnidad |
| `merchandisingDerechos` | Derecho exclusivo merch + espacio en recinto |
| `calidadEquipo` | Si equipo no es el acordado, derecho a resolver sin responsabilidad |
| `camerinos` | Cerrados con llave, aseos, espejo, toallas, wifi/oficina agente |
| `retrasos` | Retraso >30 min del promotor = reducir tiempo manteniendo cache |
| `ticketingReporting` | Reportes semanales de venta + anti-reventa |
| `invitaciones` | 10 entradas gratuitas para invitados del artista |
| `liquidacionSGAE` | Copia liquidacion SGAE en 15 dias post-evento |
| `porcentajeBeneficios` | Si se pacta %, justificar costes con facturas |
| `covid` | Clausula pandemica: renegociacion buena fe + resolucion en 15 dias |
| `certificadosSeguros` | Solicitar certificados, incumplimiento = resolucion inmediata |

**2c. `DEFAULT_LEGAL_CLAUSES` - Texto completo extraido del original**

Cada clausula nueva tendra el texto literal del contrato original de CityZen. Ejemplos:

- **contratoFirme**: "El primer pago efectuado por el Promotor al Agente, sin que el mismo objete nada transcurridos 7 dias desde su recepcion, implicara acuerdo firme sobre los terminos del presente contrato, incluso sin que el mismo haya llegado a ser firmado. El incumplimiento del calendario de pagos es causa suficiente para que el ARTISTA cancele la actuacion quedando el PROMOTOR obligado al pago del 100% del cache mas los gastos originados."

- **noAnunciarSinPago**: Se actualiza la clausula de publicidad existente para incluir "antes de haber efectuado el primer pago referido en las condiciones particulares" (como en el original).

- **segurosIndemnidad**: "El Promotor se obliga a garantizar al Agente y al Artista, la prueba de que existe un seguro de responsabilidad civil conforme a las leyes que regulen las actuaciones en espacios publicos... designando al Artista y al Agente como asegurados o beneficiarios del seguro."

- **calidadEquipo**: "El Promotor acepta que el AGENTE, a su entera discrecion, puede resolver este acuerdo sin responsabilidad de ningun tipo... si dichos equipos no son de la calidad o tipo acordado... en cuyo caso el Promotor sera responsable de pagar al Agente el precio completo."

- **retrasos**: "El AGENTE y el ARTISTA se reservan el derecho de reducir el tiempo establecido para la actuacion del ARTISTA por el mismo tiempo en que se produzca cualquier retraso por parte del PROMOTOR que sea superior a treinta (30) minutos, manteniendose en cualquier caso el importe integro del cache."

**2d. Actualizar `generateContractDocument`**

Reestructurar el documento generado para seguir la numeracion y estructura exacta del original:

```text
1. OBJETO DEL CONTRATO Y DERECHOS DE PROPIEDAD INTELECTUAL
   1.1. Propiedad intelectual
   1.2. Grabaciones (con enforcement por el promotor)

2. DERECHOS DE IMAGEN; PUBLICIDAD, PATROCINIO Y MERCHANDISING
   2.1. Publicidad (con condicion de primer pago)
   2.2. Uso del nombre
   2.3. Patrocinios
   2.4. Entrevistas / apariciones
   2.5. Merchandising (derecho exclusivo + espacio)

3. RECINTO, ESCENARIO Y CAMERINOS
   3.1. Equipo + derecho a resolver si no cumple
   3.2. Exterior: proteccion lluvia/viento
   3.3. Camerinos detallados + oficina agente

4. RIDERS Y CONTROL CREATIVO
   4.1. Rider tecnico (Anexo 1)
   4.2. Rider hospitality (Anexo 2)
   4.3. Control creativo exclusivo
   4.4. Retrasos del promotor
   4.5. Backline

5. OTRAS OBLIGACIONES DEL PROMOTOR
   5.1. Permisos + indemnizacion por sanciones
   5.2. Visados/permisos de trabajo
   5.3. Seguridad + indemnizacion danos
   5.4. Seguro RC + indemnidad terceros
   5.5. Cancelacion + fuerza mayor + COVID
   5.6. Certificados de seguros
   5.7. Ticketing: reporting semanal + anti-reventa
   5.8. Invitaciones (10 entradas)
   5.9. Liquidacion SGAE (15 dias)
   5.10. Porcentaje beneficios (si aplica)

6. EFECTIVIDAD DEL CONTRATO
7. CONFIDENCIALIDAD
8. LEY Y JURISDICCION

Firmas: EL AGENTE / EL PROMOTOR
```

**2e. Seccion de pago**

Despues de los datos bancarios, agregar automaticamente la clausula de "contrato firme" (primer pago = acuerdo vinculante).

---

**3. `src/components/ContractGenerator.tsx`** - UI del paso Legal

- Actualizar el array de clausulas en `renderLegalStep()` para incluir todas las nuevas clausulas
- Agrupar visualmente por seccion (Propiedad Intelectual, Publicidad, Recinto, Obligaciones, etc.)
- Cada clausula nueva tendra su `Textarea` editable como las existentes
- Agregar un `Collapsible` por seccion para evitar scroll infinito en el paso de clausulas

---

**4. `src/components/ContractGenerator.tsx`** - Seccion de firmas en PDF

- Agregar al final del documento generado una tabla de firmas con dos columnas: "EL AGENTE" y "EL PROMOTOR" con espacio para firma
- Incluir el pie "MOODITA" en el footer de cada pagina del PDF (reemplazando "CITYZEN MUSIC")

---

### Resumen de archivos modificados

| Archivo | Cambios |
|---|---|
| `src/lib/contractTemplates.ts` | Corregir roles invertidos, ampliar interfaz LegalClauses con 14 nuevas clausulas, actualizar defaults con texto del original, reestructurar generateContractDocument |
| `src/components/ContractGenerator.tsx` | Logo moodita, UI de clausulas agrupadas con Collapsible, firmas en PDF, footer MOODITA |

