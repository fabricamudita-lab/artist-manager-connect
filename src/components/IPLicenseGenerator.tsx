import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ArrowRight, Download, Eye, ChevronDown, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import { useTracks, useReleases } from '@/hooks/useReleases';
import { PersonSearchInput, type PersonData } from '@/components/PersonSearchInput';

function numberToSpanishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['CERO','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  if (n <= 29) return units[n];
  const tens = ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  if (n === 100) return 'CIEN';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]} Y ${units[u]}`;
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

interface IPLicenseGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contract: { title: string; content: string; pdfBlob?: Blob }) => void | Promise<void>;
  releaseId?: string;
}

interface FormData {
  fecha_dia: string;
  fecha_mes: string;
  fecha_anio: string;
  productora_nombre: string;
  productora_doc_tipo: string;
  productora_dni: string;
  productora_domicilio: string;
  productora_nombre_artistico: string;
  productora_email: string;
  colaboradora_nombre: string;
  colaboradora_doc_tipo: string;
  colaboradora_dni: string;
  colaboradora_domicilio: string;
  colaboradora_nombre_artistico: string;
  colaboradora_email: string;
  titulo_sencillo: string;
  grabacion_titulo: string;
  grabacion_calidad: string;
  grabacion_duracion: string;
  grabacion_videoclip: string;
  grabacion_fecha_fijacion: string;
  grabacion_caracter: string;
  acreditacion_nombre: string;
  acreditacion_caracter: string;
  calidad_entidad: string;
  royalty_porcentaje: string;
  firma_productora: string;
  firma_colaboradora: string;
}

// === Editable clauses interface ===
interface IPLegalClauses {
  objeto_1_1: string;
  objeto_1_2: string;
  alcance_2_1: string;
  alcance_2_2: string;
  alcance_2_3: string;
  alcance_2_4: string;
  alcance_2_5: string;
  contraprestacion_3_1: string;
  contraprestacion_3_2: string;
  contraprestacion_3_3: string;
  contraprestacion_3_4: string;
  contraprestacion_3_5: string;
  notificaciones_4_1: string;
  confidencialidad_5_1: string;
  confidencialidad_5_2: string;
  confidencialidad_5_2b: string;
  ley_6_1: string;
  ley_6_2: string;
}

const DEFAULT_IP_CLAUSES: IPLegalClauses = {
  objeto_1_1: '1.1. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesión a terceros todos los derechos de propiedad intelectual que recaen sobre su interpretación musical, fijada en la Grabación que se detalla a continuación:',
  objeto_1_2: '1.2. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesión a terceros todos los derechos que recaen sobre su imagen personal, incluyendo nombre civil o artístico, con propósito de mención e información relacionada con la Grabación, y, en especial los relativos a su imagen personal vinculada a su interpretación en el caso de que exista una grabación audiovisual (en la forma de un videoclip o similar) vinculada a la Grabación.',
  alcance_2_1: '2.1. El alcance de las cesiones de derechos de la COLABORADORA a favor de la PRODUCTORA que son objeto de este contrato, se conceden con la mayor amplitud y de forma ilimitada con la finalidad de que la PRODUCTORA pueda explotar la Grabación, el Sencillo, el videoclip y/o cualquier material promocional, publicitario y/o informativo que acompañe a los mismos, en todos los formatos y sistemas de explotación de música y audiovisuales, a través de todos los medios de explotación que existan durante la vigencia de la presente cesión de derechos y sin más limitaciones que las establecidas en el presente contrato.',
  alcance_2_2: '2.2. La COLABORADORA cede a la PRODUCTORA, a título enunciativo, pero sin carácter limitativo, el derecho de reproducción, distribución, comunicación pública y transformación necesarios para la pacífica explotación de la Grabación y, en su caso, de los audiovisuales que la acompañen, quedando facultada la PRODUCTORA para contratar con terceros la explotación de los mismos, transfiriendo a dichos terceros los mismos derechos y obligaciones que adquiere la PRODUCTORA en este contrato.',
  alcance_2_3: '2.3. La PRODUCTORA se compromete a acreditar a la COLABORADORA de la siguiente forma, siguiendo los usos y costumbres del sector y según las posibilidades de cada uno de los medios y sistemas de explotación de la Grabación, del Sencillo y, en su caso, del videoclip:',
  alcance_2_4: '2.4. Sin perjuicio de la cesión de derechos otorgada en este documento, la COLABORADORA podrá acreditar su participación en las entidades de gestión de derechos de propiedad intelectual de los artistas intérpretes y ejecutantes, con relación a la Grabación y, en su caso, al videoclip, en calidad de ({{calidad_entidad}}).',
  alcance_2_5: '2.5. Queda expresamente acordado que la PRODUCTORA, por sí o por terceros, podrá explotar la Grabación en forma de sencillo discográfico o single; en forma de videoclip incluyendo o no la imagen de la COLABORADORA; en forma de fragmentos para su uso en teasers, trailers, piezas promocionales de la Grabación, el videoclip o la carrera profesional de {{productora_nombre_artistico}}, y, con carácter general, de forma amplia siempre y cuando la interpretación de la COLABORADORA forme parte de la Grabación y no se utilice de forma independiente a esta y esté relacionada con la explotación, publicidad, promoción y/o comunicación de la carrera y productos de {{productora_nombre_artistico}} y/o la PRODUCTORA.',
  contraprestacion_3_1: '3.1. En contraprestación por la cesión de derechos que es objeto de este contrato y como remuneración total por la participación de la COLABORADORA en la Grabación y, en su caso, el videoclip, la PRODUCTORA abonará a la COLABORADORA, por sí o por terceros, un royalty de artista equivalente al {{royalty_texto}} POR CIENTO ({{royalty_porcentaje}}%) de los ingresos que la PRODUCTORA obtenga por la explotación de la Grabación y, en su caso, del videoclip, independientemente de su procedencia. A estos efectos se considerará explotación de la Grabación todo acto de comercialización que sea remunerado, incluyendo, para mayor claridad, los ingresos por venta de la Grabación en formato digital y en formato físico; los ingresos recibidos por el streaming de la Grabación; los ingresos recibidos por el streaming del videoclip si lo hubiera; los ingresos recibidos de la explotación en forma de sincronización de la Grabación y, en general, todo acto de comercialización de la Grabación en el Territorio y durante el Periodo.',
  contraprestacion_3_2: '3.2. En el caso de que posteriormente la Grabación se incorpore a un álbum u otra compilación, y los ingresos de la PRODUCTORA provengan de la explotación de dicho álbum o compilación, dichos ingresos serán repartidos entre el número de grabaciones integrantes del mismo para calcular los ingresos correspondientes a la Grabación y abonar el royalty de artista en consecuencia. La forma de cálculo del royalty, en este caso, será, por tanto, la de prorrata tituli (o partes iguales para cada uno de los títulos).',
  contraprestacion_3_3: '3.3. La PRODUCTORA será la responsable del pago del royalty de artista a la COLABORADORA, si bien la PRODUCTORA podrá encargar dicho pago a terceros a los que licencie la comercialización y/o distribución de la Grabación, de forma temporal o permanente.',
  contraprestacion_3_4: '3.4. La frecuencia del pago del royalty de artista será semestral, coincidiendo con los pagos que reciba la PRODUCTORA por parte de los terceros a quien licencie la comercialización y/o distribución del Sencillo y la Grabación y no se aplicarán descuentos por parte de la PRODUCTORA.',
  contraprestacion_3_5: '3.5. La PRODUCTORA emitirá una liquidación a favor de la COLABORADORA, que podría incluir importes negativos en el caso de que existieran devoluciones, y solicitará una factura a la COLABORADORA con la periodicidad detallada. Una vez la COLABORADORA haya emitido dicha factura, la PRODUCTORA la abonará en el transcurso de treinta (30) días, a través de transferencia bancaria a la cuenta de titularidad de la COLABORADORA que esta le indique.',
  notificaciones_4_1: '4.1. Las Partes han establecido como medio válido para el envío de cualquier comunicación relacionada con el contenido de este contrato el envío de correos electrónicos a las siguientes direcciones:',
  confidencialidad_5_1: '5.1. Las Partes se comprometen a mantener en la más estricta confidencialidad toda la información, tanto oral como escrita, que se haya puesto a disposición de la otra parte, tanto con carácter previo a la firma de esta Licencia como mientras esta esté vigente. Para ello, las Partes se comprometen a no hablar ni de forma directa ni indirecta de la información confidencial en ningún espacio público o abierto al público, ni a través de terceros sin el consentimiento previo de la otra parte. No obstante, las Partes podrán compartir la información confidencial que sea necesaria con asesores externos, abogados o contables, los cuales deberán tener suscrito un deber de confidencialidad que tenga por lo menos el alcance de esta cláusula. La obligación de mantener la información confidencial se establece sin ninguna limitación temporal.',
  confidencialidad_5_2: '5.2. Asimismo, las Partes se comprometen a cumplir con la normativa vigente en materia de protección de datos, obligándose mutuamente a no utilizar los datos personales de la otra parte para finalidades diferentes o incompatibles con la de dar cumplimiento a lo dispuesto en esta Licencia. Los datos podrán ser conservados durante el tiempo necesario para cumplir con posibles responsabilidades legales y fiscales. En caso de que, por el ámbito territorial de esta Licencia, los datos deban transferirse a Terceros Países, la PRODUCTORA se compromete a adoptar las medidas de seguridad que sean necesarias para impedir, dentro de sus posibilidades, el acceso a los datos personales a terceros no autorizados.',
  confidencialidad_5_2b: 'Las Partes podrán ejercer sus derechos de acceso, oposición, rectificación, limitación y portabilidad a través del envío de correos electrónicos a la dirección que consta en la Cláusula de Notificaciones, debiendo aportar una fotocopia del DNI para poder verificar la identidad del remitente. Todo ello sin perjuicio del derecho a interponer una reclamación ante la Agencia Española de Protección de Datos.',
  ley_6_1: '6.1. Esta Licencia se regirá e interpretará de acuerdo con el ordenamiento jurídico español y, en concreto, por lo dispuesto en la Ley de Propiedad Intelectual.',
  ley_6_2: '6.2. Ante cualquier incumplimiento, discrepancia o conflicto que pueda surgir entre las Partes, ambas se comprometen, en primer lugar, a intentar resolverlo de forma amistosa, otorgando a la otra parte un plazo de al menos diez (10) días a contar desde la fecha en la que la parte perjudicada remita a la otra los motivos en los que se basa el incumplimiento o el conflicto. Una vez agotada la vía amistosa, las Partes, con renuncia expresa a cualquier fuero que pudiere corresponderles, acuerdan someterse al Tribunal Arbitral de Barcelona (TAB).',
};

const IP_CLAUSE_SECTIONS = [
  {
    title: '1. Objeto',
    fields: [
      { key: 'objeto_1_1' as const, label: '1.1 Cesión de derechos' },
      { key: 'objeto_1_2' as const, label: '1.2 Cesión de imagen' },
    ],
  },
  {
    title: '2. Alcance de la cesión',
    fields: [
      { key: 'alcance_2_1' as const, label: '2.1 Amplitud' },
      { key: 'alcance_2_2' as const, label: '2.2 Derechos específicos' },
      { key: 'alcance_2_3' as const, label: '2.3 Acreditación' },
      { key: 'alcance_2_4' as const, label: '2.4 Entidades de gestión' },
      { key: 'alcance_2_5' as const, label: '2.5 Explotación' },
    ],
  },
  {
    title: '3. Contraprestación',
    fields: [
      { key: 'contraprestacion_3_1' as const, label: '3.1 Royalty' },
      { key: 'contraprestacion_3_2' as const, label: '3.2 Prorrata' },
      { key: 'contraprestacion_3_3' as const, label: '3.3 Responsabilidad pago' },
      { key: 'contraprestacion_3_4' as const, label: '3.4 Frecuencia' },
      { key: 'contraprestacion_3_5' as const, label: '3.5 Liquidación' },
    ],
  },
  {
    title: '4. Notificaciones',
    fields: [
      { key: 'notificaciones_4_1' as const, label: '4.1 Medios de comunicación' },
    ],
  },
  {
    title: '5. Confidencialidad',
    fields: [
      { key: 'confidencialidad_5_1' as const, label: '5.1 Información confidencial' },
      { key: 'confidencialidad_5_2' as const, label: '5.2 Protección de datos' },
      { key: 'confidencialidad_5_2b' as const, label: '5.2b Derechos ARCO' },
    ],
  },
  {
    title: '6. Ley aplicable',
    fields: [
      { key: 'ley_6_1' as const, label: '6.1 Ordenamiento' },
      { key: 'ley_6_2' as const, label: '6.2 Resolución de conflictos' },
    ],
  },
];

const STEPS = ['Productora', 'Colaborador/a', 'Grabación y Derechos', 'Cláusulas', 'Vista Previa'];

const defaultData: FormData = {
  fecha_dia: new Date().getDate().toString(), fecha_mes: MESES_ES[new Date().getMonth()], fecha_anio: new Date().getFullYear().toString(),
  productora_nombre: '', productora_doc_tipo: 'DNI', productora_dni: '', productora_domicilio: '',
  productora_nombre_artistico: '', productora_email: '',
  colaboradora_nombre: '', colaboradora_doc_tipo: 'DNI', colaboradora_dni: '', colaboradora_domicilio: '',
  colaboradora_nombre_artistico: '', colaboradora_email: '',
  titulo_sencillo: '', grabacion_titulo: '', grabacion_calidad: 'músico intérprete',
  grabacion_duracion: '', grabacion_videoclip: 'Sí', grabacion_fecha_fijacion: '',
  grabacion_caracter: 'featured artist', acreditacion_nombre: '', acreditacion_caracter: '',
  calidad_entidad: 'músico intérprete', royalty_porcentaje: '20',
  firma_productora: '', firma_colaboradora: '',
};

function s(val: string | undefined): string {
  return val?.trim() || '___________';
}

function resolveClause(text: string, d: FormData): string {
  const royaltyNum = parseInt(d.royalty_porcentaje) || 0;
  const royaltyText = numberToSpanishText(royaltyNum) || s('');
  return text
    .replace(/\{\{calidad_entidad\}\}/g, s(d.calidad_entidad))
    .replace(/\{\{productora_nombre_artistico\}\}/g, s(d.productora_nombre_artistico))
    .replace(/\{\{royalty_texto\}\}/g, royaltyText)
    .replace(/\{\{royalty_porcentaje\}\}/g, s(d.royalty_porcentaje))
    .replace(/\{\{grabacion_titulo\}\}/g, s(d.grabacion_titulo))
    .replace(/\{\{productora_email\}\}/g, s(d.productora_email))
    .replace(/\{\{colaboradora_email\}\}/g, s(d.colaboradora_email));
}

function generatePDF(d: FormData, clauses: IPLegalClauses): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ml = 30, mr = 30, mb = 25;
  const cw = pw - ml - mr;
  let y = 0;
  let pageNum = 1;

  const interline = 4.9;
  const subItemSpace = 7.7;
  const sectionSpace = 15.5;
  const indent1 = 6.3;
  const indent2 = 12.7;
  const indentSub = 12.5;

  const fontSize = 11;

  const addFooter = () => {
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text(String(pageNum), pw / 2, ph - 15, { align: 'center' });
  };

  const checkPage = (needed: number = 10) => {
    if (y + needed > ph - mb) {
      addFooter();
      pdf.addPage();
      pageNum++;
      y = 20;
    }
  };

  // Render justified text - pass full text to jsPDF and let it handle splitting
  const renderLines = (text: string, xLeft: number, maxW: number) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    const lines: string[] = pdf.splitTextToSize(text, maxW);
    for (let i = 0; i < lines.length; i++) {
      checkPage();
      // Only justify non-last lines (last line should be left-aligned)
      if (i < lines.length - 1) {
        pdf.text(lines[i], xLeft, y, { maxWidth: maxW, align: 'justify' });
      } else {
        pdf.text(lines[i], xLeft, y);
      }
      y += interline;
    }
  };

  const addHangingParagraph = (label: string, text: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'bold');
    const labelW = pdf.getTextWidth(label + ' ');
    pdf.text(label, ml, y);
    pdf.setFont('times', 'normal');

    const firstLineW = cw - labelW;
    const restLines = pdf.splitTextToSize(text, firstLineW);

    if (restLines.length > 0) {
      pdf.text(restLines[0], ml + labelW, y, { maxWidth: firstLineW, align: 'justify' });
      y += interline;
      if (restLines.length > 1) {
        const cont = restLines.slice(1).join(' ');
        const contW = cw - indent1;
        renderLines(cont, ml + indent1, contW);
      }
    } else {
      y += interline;
    }
  };

  const addNumberedHanging = (label: string, text: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    pdf.setFont('times', 'normal');
    const xNum = ml + indent1;
    const xText = ml + indent2;
    const textW = cw - indent2;

    pdf.text(label, xNum, y);
    const labelW = pdf.getTextWidth(label + ' ');
    const firstLineAvail = cw - (indent1 + labelW);
    const allLines = pdf.splitTextToSize(text, Math.min(firstLineAvail, textW));

    if (allLines.length > 0) {
      pdf.text(allLines[0], xNum + labelW, y, { maxWidth: firstLineAvail, align: 'justify' });
      y += interline;
      if (allLines.length > 1) {
        const cont = allLines.slice(1).join(' ');
        const contLines: string[] = pdf.splitTextToSize(cont, textW);
        for (let i = 0; i < contLines.length; i++) {
          checkPage();
          if (i < contLines.length - 1) {
            pdf.text(contLines[i], xText, y, { maxWidth: textW, align: 'justify' });
          } else {
            pdf.text(contLines[i], xText, y);
          }
          y += interline;
        }
      }
    } else {
      y += interline;
    }
  };

  const addParagraph = (text: string, indent: number = 0) => {
    pdf.setFont('times', 'normal');
    pdf.setFontSize(fontSize);
    renderLines(text, ml + indent, cw - indent);
  };

  const addSubItem = (letter: string, title: string, value: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    const x = ml + indentSub;
    pdf.setFont('times', 'normal');
    const letterW = pdf.getTextWidth(letter);
    pdf.text(letter, x, y);
    pdf.setFont('times', 'bold');
    const titleW = pdf.getTextWidth(title + ' ');
    pdf.text(title, x + letterW, y);
    pdf.setFont('times', 'normal');
    const valX = x + letterW + titleW;
    const remaining = cw - indentSub - letterW - titleW;
    if (remaining > 0 && pdf.getTextWidth(value) <= remaining) {
      pdf.text(value, valX, y, { maxWidth: remaining, align: 'justify' });
      y += subItemSpace;
    } else {
      y += interline;
      renderLines(value, x, cw - indentSub);
      y += subItemSpace - interline;
    }
  };

  const addBoldInline = (boldPart: string, normalPart: string) => {
    checkPage();
    pdf.setFontSize(fontSize);
    const x = ml + indent2;
    const maxW = cw - indent2;
    pdf.setFont('times', 'bold');
    const bw = pdf.getTextWidth(boldPart + ' ');
    pdf.text(boldPart, x, y);
    pdf.setFont('times', 'normal');
    const valLines: string[] = pdf.splitTextToSize(normalPart, maxW - bw);
    if (valLines.length > 0) {
      pdf.text(valLines[0], x + bw, y, { maxWidth: maxW - bw, align: 'justify' });
      y += interline;
      for (let i = 1; i < valLines.length; i++) {
        checkPage();
        pdf.text(valLines[i], x, y, { maxWidth: maxW, align: 'justify' });
        y += interline;
      }
    } else {
      y += interline;
    }
  };

  const addCenteredSection = (text: string) => {
    checkPage();
    pdf.setFont('times', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(text, pw / 2, y, { align: 'center' });
  };

  const addClauseTitle = (num: string, text: string) => {
    checkPage(12);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(`${num}. ${text}`, ml, y);
  };

  // Resolve all clauses with dynamic data
  const c = {} as IPLegalClauses;
  for (const k of Object.keys(clauses) as Array<keyof IPLegalClauses>) {
    c[k] = resolveClause(clauses[k], d);
  }

  // === PAGE 1 ===
  y = 25.3;
  addCenteredSection('LICENCIA DE CESIÓN DE DERECHOS DE PROPIEDAD INTELECTUAL');

  y = 48.5;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(fontSize);
  pdf.text(`En Barcelona, a ${s(d.fecha_dia)} de ${s(d.fecha_mes)} de ${s(d.fecha_anio)}`, ml, y);

  y = 64.0;
  addCenteredSection('REUNIDOS');

  y += sectionSpace;
  addHangingParagraph('DE UNA PARTE, ',
    `${s(d.productora_nombre)}, mayor de edad, con ${s(d.productora_doc_tipo)} ${s(d.productora_dni)} y domicilio a estos efectos en ${s(d.productora_domicilio)}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará la PRODUCTORA.`);

  y += sectionSpace;
  addHangingParagraph('DE OTRA PARTE, ',
    `${s(d.colaboradora_nombre)}, mayor de edad, con ${s(d.colaboradora_doc_tipo)} ${s(d.colaboradora_dni)} y domicilio a estos efectos en ${s(d.colaboradora_domicilio)}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará el COLABORADOR o la COLABORADORA indistintamente.`);

  y += subItemSpace;
  addParagraph('En adelante, ambas partes, serán denominadas conjuntamente como las Partes.');

  y += subItemSpace;
  addParagraph('Las Partes se reconocen recíprocamente la capacidad legal necesaria para contratar y obligarse y, a tal efecto,');

  y += subItemSpace;
  addCenteredSection('MANIFIESTAN');

  y += sectionSpace;
  addNumberedHanging('I)', `Que la PRODUCTORA, es una compositora, intérprete y productora fonográfica que, en su calidad de productora fonográfica, está produciendo un sencillo fonográfico titulado tentativamente "${s(d.grabacion_titulo)}" (el Sencillo) que será explotado comercialmente bajo su nombre artístico "${s(d.productora_nombre_artistico)}", por sí o por terceros.`);

  y += sectionSpace;
  addNumberedHanging('II)', 'Que la PRODUCTORA ha solicitado a la COLABORADORA que participe, en calidad de música intérprete y/o ejecutante en una o más obras musicales (la/s Grabación/es), las cuales se detallarán, o para su explotación en forma de sencillo fonográfico, incluyendo o no videoclip y/o materiales audiovisuales promocionales.');

  y += sectionSpace;
  addNumberedHanging('III)', `Que la COLABORADORA, conocida artísticamente como "${s(d.colaboradora_nombre_artistico)}", es una intérprete musical independiente, facultada para aceptar la propuesta de colaboración de la PRODUCTORA, en los términos que se dirán, que no está sujeta a contratos de exclusiva que se lo impidan o bien habiendo obtenido las autorizaciones pertinentes de terceros para su aceptación y posterior cesión de derechos de propiedad intelectual sobre sus interpretaciones musicales.`);

  y += sectionSpace;
  addNumberedHanging('IV)', 'Que la PRODUCTORA ha llevado a cabo la fijación de las interpretaciones de la COLABORADORA en la/s Grabación/es a satisfacción de las Partes.');

  y += sectionSpace;
  addParagraph('Con la finalidad de acordar los términos y condiciones de la colaboración entre las Partes y formalizar la cesión de los derechos de propiedad intelectual de la COLABORADORA a favor de la PRODUCTORA, las Partes celebran el presente contrato de Licencia de Derechos de Propiedad Intelectual y acuerdan regirse de conformidad a las siguientes', indent1);

  y += sectionSpace;
  addCenteredSection('CLÁUSULAS');

  // 1. OBJETO
  y += subItemSpace;
  addClauseTitle('1', 'OBJETO');

  y += sectionSpace;
  addParagraph(c.objeto_1_1, indent1);

  y += subItemSpace;
  addSubItem('a. ', 'Título de la obra Grabación:', s(d.grabacion_titulo));
  addSubItem('b. ', 'Calidad en que interviene la COLABORADORA:', s(d.grabacion_calidad));
  addSubItem('c. ', 'Duración de la Grabación:', s(d.grabacion_duracion));
  addSubItem('d. ', 'Participación (Sí/No) en videoclip de la Grabación:', s(d.grabacion_videoclip));
  addSubItem('e. ', 'Fecha de la fijación:', s(d.grabacion_fecha_fijacion));
  addSubItem('f. ', 'Carácter de la intervención:', s(d.grabacion_caracter));

  y += sectionSpace;
  addParagraph(c.objeto_1_2, indent1);

  // 2. ALCANCE
  y += sectionSpace;
  addClauseTitle('2', 'ALCANCE DE LA CESIÓN DE DERECHOS');

  y += sectionSpace;
  addParagraph(c.alcance_2_1, indent1);

  y += interline;
  addBoldInline('a. PERIODO:', 'A perpetuidad.');
  addBoldInline('b. TERRITORIO:', 'El Universo.');
  addBoldInline('c. MEDIOS:', 'Todos los medios existentes durante la vigencia de este contrato.');

  y += subItemSpace;
  addParagraph(c.alcance_2_2, indent1);

  y += subItemSpace;
  addParagraph(c.alcance_2_3, indent1);

  y += subItemSpace;
  addSubItem('a. ', 'Nombre artístico:', s(d.acreditacion_nombre));
  addSubItem('b. ', 'Carácter de la intervención:', s(d.acreditacion_caracter));

  y += subItemSpace;
  addParagraph(c.alcance_2_4, indent1);

  y += subItemSpace;
  addParagraph(c.alcance_2_5, indent1);

  // 3. CONTRAPRESTACIÓN
  y += sectionSpace;
  addClauseTitle('3', 'CONTRAPRESTACIÓN');

  y += sectionSpace;
  addParagraph(c.contraprestacion_3_1, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_2, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_3, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_4, indent1);

  y += subItemSpace;
  addParagraph(c.contraprestacion_3_5, indent1);

  // 4. NOTIFICACIONES
  y += sectionSpace;
  addClauseTitle('4', 'NOTIFICACIONES');

  y += sectionSpace;
  addParagraph(c.notificaciones_4_1, indent1);

  y += subItemSpace;
  addSubItem('a. ', 'De la PRODUCTORA:', s(d.productora_email));
  addSubItem('b. ', 'De la COLABORADORA:', s(d.colaboradora_email));

  // 5. CONFIDENCIALIDAD
  y += sectionSpace;
  addClauseTitle('5', 'CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS');

  y += sectionSpace;
  addParagraph(c.confidencialidad_5_1, indent1);

  y += subItemSpace;
  addParagraph(c.confidencialidad_5_2, indent1);

  y += subItemSpace;
  addParagraph(c.confidencialidad_5_2b, indent1);

  // 6. LEY APLICABLE
  y += sectionSpace;
  addClauseTitle('6', 'LEY APLICABLE Y RESOLUCIÓN DE CONFLICTOS');

  y += sectionSpace;
  addParagraph(c.ley_6_1, indent1);

  y += subItemSpace;
  addParagraph(c.ley_6_2, indent1);

  // Closing
  y += sectionSpace;
  addParagraph('Y en señal de conformidad con lo previsto en este documento y para hacer efectiva la cesión de derechos que contiene esta Licencia, las Partes la firman por duplicado en el lugar y la fecha que consta en el encabezado de este documento.');

  // Signature block
  checkPage(50);
  y += 15;
  const colW = (cw - 20) / 2;

  pdf.setFont('times', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text('La PRODUCTORA', ml + colW / 2, y, { align: 'center' });
  pdf.text('La COLABORADORA', ml + colW + 20 + colW / 2, y, { align: 'center' });

  y += 25;
  pdf.setDrawColor(0);
  pdf.line(ml, y, ml + colW, y);
  pdf.line(ml + colW + 20, y, ml + colW + 20 + colW, y);

  y += 6;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(fontSize);
  pdf.text(s(d.firma_productora), ml + colW / 2, y, { align: 'center' });
  pdf.text(s(d.firma_colaboradora), ml + colW + 20 + colW / 2, y, { align: 'center' });

  addFooter();

  return pdf;
}

export function IPLicenseGenerator({ open, onOpenChange, onSave, releaseId: externalReleaseId }: IPLicenseGeneratorProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({ ...defaultData });
  const [ipClauses, setIpClauses] = useState<IPLegalClauses>({ ...DEFAULT_IP_CLAUSES });
  const [manualTrack, setManualTrack] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>(externalReleaseId);
  const effectiveReleaseId = externalReleaseId || selectedReleaseId;
  const { data: releases = [] } = useReleases();
  const { data: tracks = [] } = useTracks(effectiveReleaseId);

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'colaboradora_nombre_artistico') {
        if (!prev.acreditacion_nombre || prev.acreditacion_nombre === prev.colaboradora_nombre_artistico) {
          next.acreditacion_nombre = value;
        }
      }
      if (field === 'grabacion_caracter') {
        if (!prev.acreditacion_caracter || prev.acreditacion_caracter === prev.grabacion_caracter) {
          next.acreditacion_caracter = value;
        }
      }
      if (field === 'productora_nombre') {
        if (!prev.firma_productora || prev.firma_productora === prev.productora_nombre) {
          next.firma_productora = value;
        }
      }
      if (field === 'colaboradora_nombre') {
        if (!prev.firma_colaboradora || prev.firma_colaboradora === prev.colaboradora_nombre) {
          next.firma_colaboradora = value;
        }
      }
      return next;
    });
  };

  const handleSelectPerson = (person: PersonData, target: 'productora' | 'colaboradora') => {
    setFormData(prev => {
      const next = { ...prev };
      const fullName = person.legal_name || person.name;
      next[`${target}_nombre`] = fullName;
      if (person.nif) next[`${target}_dni`] = person.nif;
      if (person.address) next[`${target}_domicilio`] = person.address;
      if (person.stage_name) next[`${target}_nombre_artistico`] = person.stage_name;
      if (person.email) next[`${target}_email`] = person.email;
      // Sync dependent fields
      if (target === 'productora') {
        if (!prev.firma_productora || prev.firma_productora === prev.productora_nombre) {
          next.firma_productora = fullName;
        }
      }
      if (target === 'colaboradora') {
        if (!prev.firma_colaboradora || prev.firma_colaboradora === prev.colaboradora_nombre) {
          next.firma_colaboradora = fullName;
        }
        if (!prev.acreditacion_nombre || prev.acreditacion_nombre === prev.colaboradora_nombre_artistico) {
          next.acreditacion_nombre = person.stage_name || '';
        }
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const pdf = generatePDF(formData, ipClauses);
    const blob = pdf.output('blob');
    
    if (onSave) {
      await onSave({
        title: `Licencia IP - ${formData.colaboradora_nombre_artistico || formData.colaboradora_nombre || 'Sin nombre'}`,
        content: `Licencia de Cesion de Derechos de Propiedad Intelectual - ${formData.titulo_sencillo}`,
        pdfBlob: blob,
      });
    } else {
      pdf.save(`Licencia_IP_${formData.titulo_sencillo || 'contrato'}.pdf`);
    }
    
    onOpenChange(false);
    setStep(0);
    setFormData({ ...defaultData });
    setIpClauses({ ...DEFAULT_IP_CLAUSES });
    if (!externalReleaseId) setSelectedReleaseId(undefined);
    setManualTrack(false);
  };

  const handlePreview = () => {
    const pdf = generatePDF(formData, ipClauses);
    const blobUrl = URL.createObjectURL(pdf.output('blob'));
    window.open(blobUrl, '_blank');
  };

  const renderClausesStep = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Cláusulas del contrato</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIpClauses({ ...DEFAULT_IP_CLAUSES })}
          className="text-xs gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar predeterminadas
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Puedes editar el texto de cada cláusula. Los valores entre {'{{llaves}}'} se sustituirán automáticamente con los datos del formulario.</p>
      {IP_CLAUSE_SECTIONS.map((section) => (
        <Collapsible key={section.title}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50">
            {section.title}
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 pl-2">
            {section.fields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Textarea
                  value={ipClauses[field.key]}
                  onChange={(e) => setIpClauses(prev => ({ ...prev, [field.key]: e.target.value }))}
                  rows={4}
                  className="text-xs mt-1"
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Datos de la Productora</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Día</Label><Input value={formData.fecha_dia} onChange={e => update('fecha_dia', e.target.value)} placeholder="15" /></div>
              <div><Label>Mes</Label><Input value={formData.fecha_mes} onChange={e => update('fecha_mes', e.target.value)} placeholder="enero" /></div>
              <div><Label>Año</Label><Input value={formData.fecha_anio} onChange={e => update('fecha_anio', e.target.value)} /></div>
            </div>
            <div><Label>Nombre completo</Label><PersonSearchInput value={formData.productora_nombre} onChange={v => update('productora_nombre', v)} onSelect={p => handleSelectPerson(p, 'productora')} placeholder="Buscar o escribir nombre..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo documento</Label>
                <Select value={formData.productora_doc_tipo} onValueChange={v => update('productora_doc_tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="NIE">NIE</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Número de {formData.productora_doc_tipo}</Label>
                <Input value={formData.productora_dni} onChange={e => update('productora_dni', e.target.value)} placeholder={`Número de ${formData.productora_doc_tipo}`} />
              </div>
            </div>
            <div><Label>Domicilio</Label><Input value={formData.productora_domicilio} onChange={e => update('productora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.productora_nombre_artistico} onChange={e => update('productora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.productora_email} onChange={e => update('productora_email', e.target.value)} /></div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Datos del Colaborador/a</h3>
            <div><Label>Nombre completo</Label><PersonSearchInput value={formData.colaboradora_nombre} onChange={v => update('colaboradora_nombre', v)} onSelect={p => handleSelectPerson(p, 'colaboradora')} placeholder="Buscar o escribir nombre..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo documento</Label>
                <Select value={formData.colaboradora_doc_tipo} onValueChange={v => update('colaboradora_doc_tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="NIE">NIE</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Número de {formData.colaboradora_doc_tipo}</Label>
                <Input value={formData.colaboradora_dni} onChange={e => update('colaboradora_dni', e.target.value)} placeholder={`Número de ${formData.colaboradora_doc_tipo}`} />
              </div>
            </div>
            <div><Label>Domicilio</Label><Input value={formData.colaboradora_domicilio} onChange={e => update('colaboradora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.colaboradora_nombre_artistico} onChange={e => update('colaboradora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.colaboradora_email} onChange={e => update('colaboradora_email', e.target.value)} /></div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Grabación y Derechos</h3>
            {!externalReleaseId && (
              <div>
                <Label>Lanzamiento</Label>
                <Select
                  value={selectedReleaseId || ''}
                  onValueChange={(v) => {
                    setSelectedReleaseId(v === '__none__' ? undefined : v);
                    setManualTrack(false);
                    update('grabacion_titulo', '');
                    update('titulo_sencillo', '');
                    update('grabacion_duracion', '');
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un lanzamiento (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin lanzamiento</SelectItem>
                    {releases.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} ({r.type === 'album' ? 'Álbum' : r.type === 'ep' ? 'EP' : 'Single'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Título de la Grabación</Label>
              {tracks.length > 0 && !manualTrack ? (
                <Select
                  value={formData.grabacion_titulo}
                  onValueChange={(v) => {
                    if (v === '__other__') {
                      setManualTrack(true);
                      update('grabacion_titulo', '');
                      update('titulo_sencillo', '');
                      update('grabacion_duracion', '');
                      return;
                    }
                    const track = tracks.find(t => t.title === v);
                    update('grabacion_titulo', v);
                    update('titulo_sencillo', v);
                    if (track && track.duration) {
                      update('grabacion_duracion', formatDuration(track.duration));
                    } else if (track) {
                      // Fallback: extract duration from audio file
                      (async () => {
                        try {
                          const { data: versions } = await supabase
                            .from('track_versions')
                            .select('file_url')
                            .eq('track_id', track.id)
                            .order('version_number', { ascending: false })
                            .limit(1);
                          if (versions?.[0]?.file_url) {
                            const audio = new Audio(versions[0].file_url);
                            audio.addEventListener('loadedmetadata', async () => {
                              const dur = Math.round(audio.duration);
                              if (dur && isFinite(dur)) {
                                update('grabacion_duracion', formatDuration(dur));
                                await supabase.from('tracks').update({ duration: dur }).eq('id', track.id);
                              }
                            });
                            audio.load();
                          }
                        } catch (e) {
                          console.warn('Could not extract track duration:', e);
                        }
                      })();
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un track" /></SelectTrigger>
                  <SelectContent>
                    {tracks.map(t => (
                      <SelectItem key={t.id} value={t.title}>{t.track_number}. {t.title}{t.duration ? ` (${formatDuration(t.duration)})` : ''}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Otro (escribir manualmente)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input value={formData.grabacion_titulo} onChange={e => { update('grabacion_titulo', e.target.value); update('titulo_sencillo', e.target.value); }} placeholder="Título de la grabación" className="flex-1" />
                  {tracks.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setManualTrack(false)}>Tracks</Button>
                  )}
                </div>
              )}
            </div>
            <div><Label>Calidad de intervención</Label>
              <Select value={formData.grabacion_calidad} onValueChange={v => update('grabacion_calidad', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="músico intérprete">Músico intérprete</SelectItem>
                  <SelectItem value="músico ejecutante">Músico ejecutante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duración</Label><Input value={formData.grabacion_duracion} onChange={e => update('grabacion_duracion', e.target.value)} placeholder="3:45" /></div>
            <div><Label>Videoclip</Label>
              <Select value={formData.grabacion_videoclip} onValueChange={v => update('grabacion_videoclip', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sí">Sí</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fecha de fijación</Label><Input value={formData.grabacion_fecha_fijacion} onChange={e => update('grabacion_fecha_fijacion', e.target.value)} placeholder="dd/mm/aaaa" /></div>
            <div><Label>Carácter de la intervención</Label>
              <Select value={formData.grabacion_caracter} onValueChange={v => update('grabacion_caracter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main artist">Main artist</SelectItem>
                  <SelectItem value="featured artist">Featured artist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nombre para acreditación</Label><Input value={formData.acreditacion_nombre} onChange={e => update('acreditacion_nombre', e.target.value)} /></div>
              <div><Label>Carácter para acreditación</Label><Input value={formData.acreditacion_caracter} onChange={e => update('acreditacion_caracter', e.target.value)} placeholder="featured artist" /></div>
            </div>
            <div>
              <Label>Royalty (%)</Label>
              <div className="flex items-center gap-3">
                <Input type="number" min="0" max="100" value={formData.royalty_porcentaje} onChange={e => update('royalty_porcentaje', e.target.value)} className="w-24" />
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {numberToSpanishText(parseInt(formData.royalty_porcentaje) || 0) || '—'} POR CIENTO
                </Badge>
              </div>
            </div>
          </div>
        );
      case 3:
        return renderClausesStep();
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Vista Previa y Firmas</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Productora:</strong> {formData.productora_nombre} ({formData.productora_nombre_artistico})</p>
              <p><strong>Colaborador/a:</strong> {formData.colaboradora_nombre} ({formData.colaboradora_nombre_artistico})</p>
              <p><strong>Grabación (Sencillo):</strong> {formData.grabacion_titulo} - {formData.grabacion_duracion}</p>
              <p><strong>Royalty:</strong> {formData.royalty_porcentaje}% ({numberToSpanishText(parseInt(formData.royalty_porcentaje) || 0)})</p>
            </div>
            <div><Label>Nombre firma Productora</Label><Input value={formData.firma_productora} onChange={e => update('firma_productora', e.target.value)} /></div>
            <div><Label>Nombre firma Colaboradora</Label><Input value={formData.firma_colaboradora} onChange={e => update('firma_colaboradora', e.target.value)} /></div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setStep(0); } }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Licencia de Propiedad Intelectual</DialogTitle>
          <div className="flex gap-1 mt-2">
            {STEPS.map((label, i) => (
              <div key={label} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Paso {step + 1} de {STEPS.length}: {STEPS[step]}</p>
        </DialogHeader>

        {renderStep()}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          <div className="flex gap-2">
            {step === STEPS.length - 1 && (
              <>
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  Vista previa
                </Button>
                <Button onClick={handleGenerate}>
                  <Download className="h-4 w-4 mr-1" />
                  Generar PDF
                </Button>
              </>
            )}
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep(step + 1)}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
