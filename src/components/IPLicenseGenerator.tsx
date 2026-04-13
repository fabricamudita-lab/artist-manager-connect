import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Download, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import { useTracks } from '@/hooks/useReleases';

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
  productora_dni: string;
  productora_domicilio: string;
  productora_nombre_artistico: string;
  productora_email: string;
  colaboradora_nombre: string;
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

const STEPS = ['Productora', 'Colaborador/a', 'Grabación y Derechos', 'Vista Previa'];

const defaultData: FormData = {
  fecha_dia: new Date().getDate().toString(), fecha_mes: MESES_ES[new Date().getMonth()], fecha_anio: new Date().getFullYear().toString(),
  productora_nombre: '', productora_dni: '', productora_domicilio: '',
  productora_nombre_artistico: '', productora_email: '',
  colaboradora_nombre: '', colaboradora_dni: '', colaboradora_domicilio: '',
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

function generatePDF(d: FormData): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ml = 25, mr = 25, mt = 20, mb = 25;
  const cw = pw - ml - mr;
  let y = mt;
  let pageNum = 1;

  const addFooter = () => {
    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text(String(pageNum), pw / 2, ph - 15, { align: 'center' });
  };

  const checkPage = (needed: number = 12) => {
    if (y + needed > ph - mb) {
      addFooter();
      pdf.addPage();
      pageNum++;
      y = mt;
    }
  };

  const addTitle = (text: string, size: number = 12) => {
    checkPage(20);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, cw);
    lines.forEach((line: string) => {
      checkPage();
      pdf.text(line, pw / 2, y, { align: 'center' });
      y += size * 0.45;
    });
    y += 6;
  };

  const addSection = (text: string) => {
    checkPage(16);
    y += 8;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text(text, ml, y);
    y += 10;
  };

  const addClauseTitle = (num: string, text: string) => {
    checkPage(16);
    y += 6;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text(`${num}. ${text}`, ml, y);
    y += 8;
  };

  const addParagraph = (text: string, indent: number = 0) => {
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
    const effectiveWidth = cw - indent;
    const lines = pdf.splitTextToSize(text, effectiveWidth);
    lines.forEach((line: string) => {
      checkPage();
      pdf.text(line, ml + indent, y, { maxWidth: effectiveWidth, align: 'justify' });
      y += 5.5;
    });
    y += 2;
  };

  // Hanging indent: label at left margin, continuation lines indented
  const addHangingParagraph = (label: string, text: string, hangIndent: number = 10) => {
    checkPage();
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    const labelWidth = pdf.getTextWidth(label + ' ');
    const fullText = label + ' ' + text;
    
    // First line: render label bold, then normal text on same line
    pdf.text(label, ml, y);
    pdf.setFont('times', 'normal');
    
    const firstLineAvail = cw - labelWidth;
    const restLines = pdf.splitTextToSize(text, firstLineAvail);
    
    if (restLines.length > 0) {
      pdf.text(restLines[0], ml + labelWidth, y);
      y += 5.5;
      
      // Continuation lines with hanging indent
      if (restLines.length > 1) {
        const continuationText = restLines.slice(1).join(' ');
        const indentedLines = pdf.splitTextToSize(continuationText, cw - hangIndent);
        indentedLines.forEach((line: string) => {
          checkPage();
          pdf.text(line, ml + hangIndent, y, { maxWidth: cw - hangIndent, align: 'justify' });
          y += 5.5;
        });
      }
    } else {
      y += 5.5;
    }
    y += 2;
  };

  // Hanging indent for numbered items (I, II, III, IV)
  const addNumberedHanging = (label: string, text: string) => {
    checkPage();
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    const hangIndent = 10;
    
    const labelWidth = pdf.getTextWidth(label + ' ');
    const firstLineAvail = cw - labelWidth;
    const restLines = pdf.splitTextToSize(text, firstLineAvail);
    
    pdf.text(label, ml, y);
    
    if (restLines.length > 0) {
      pdf.text(restLines[0], ml + labelWidth, y);
      y += 5.5;
      
      if (restLines.length > 1) {
        const continuationText = restLines.slice(1).join(' ');
        const indentedLines = pdf.splitTextToSize(continuationText, cw - hangIndent);
        indentedLines.forEach((line: string) => {
          checkPage();
          pdf.text(line, ml + hangIndent, y, { maxWidth: cw - hangIndent, align: 'justify' });
          y += 5.5;
        });
      }
    } else {
      y += 5.5;
    }
    y += 3;
  };

  const addBoldInline = (boldPart: string, normalPart: string, indent: number = 0) => {
    checkPage();
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    const bw = pdf.getTextWidth(boldPart + ' ');
    const effectiveWidth = cw - indent;
    // If it all fits on one line
    if (bw + pdf.getTextWidth(normalPart.substring(0, 30)) < effectiveWidth) {
      pdf.text(boldPart, ml + indent, y);
      pdf.setFont('times', 'normal');
      const remaining = pdf.splitTextToSize(normalPart, effectiveWidth - bw);
      if (remaining.length > 0) {
        pdf.text(remaining[0], ml + indent + bw, y);
        y += 5.5;
        for (let i = 1; i < remaining.length; i++) {
          checkPage();
          pdf.text(remaining[i], ml + indent, y, { maxWidth: effectiveWidth, align: 'justify' });
          y += 5.5;
        }
      } else {
        y += 5.5;
      }
    } else {
      pdf.text(boldPart, ml + indent, y);
      y += 5.5;
      pdf.setFont('times', 'normal');
      addParagraph(normalPart, indent);
    }
    y += 1;
  };

  const addSubItem = (label: string, value: string) => {
    checkPage();
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    const labelW = pdf.getTextWidth(label + ' ');
    pdf.text(label, ml + 15, y);
    pdf.setFont('times', 'normal');
    pdf.text(value, ml + 15 + labelW, y);
    y += 8;
  };

  // === PAGE 1: Title & REUNIDOS ===
  y = mt + 10;
  addTitle('LICENCIA DE CESIÓN DE DERECHOS DE PROPIEDAD INTELECTUAL');
  y += 10;

  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);
  pdf.text(`En Barcelona, a ${s(d.fecha_dia)} de ${s(d.fecha_mes)} de ${s(d.fecha_anio)}`, ml, y);
  y += 12;

  addSection('REUNIDOS');

  addHangingParagraph('DE UNA PARTE,',
    `${s(d.productora_nombre)}, mayor de edad, con DNI (NIE/DNI/PASSAPORTE) ${s(d.productora_dni)} y domicilio a estos efectos en ${s(d.productora_domicilio)}, interviniendo en su propio nombre y representacion. En adelante, a esta parte se la denominara la PRODUCTORA.`, 10);

  y += 4;

  addHangingParagraph('DE OTRA PARTE,',
    `${s(d.colaboradora_nombre)}, mayor de edad, con DNI (NIE/DNI/PASSAPORTE) ${s(d.colaboradora_dni)} y domicilio a estos efectos en ${s(d.colaboradora_domicilio)}, interviniendo en su propio nombre y representacion. En adelante, a esta parte se la denominara el COLABORADOR o la COLABORADORA indistintamente.`, 10);

  addParagraph('En adelante, ambas partes, seran denominadas conjuntamente como las Partes.');
  addParagraph('Las Partes se reconocen reciprocamente la capacidad legal necesaria para contratar y obligarse y, a tal efecto,');

  addSection('MANIFIESTAN');

  addNumberedHanging('I)', `Que la PRODUCTORA, es una compositora, interprete y productora fonografica que, en su calidad de productora fonografica, esta produciendo un sencillo fonografico titulado tentativamente "${s(d.titulo_sencillo)}" (el Album) que sera explotado comercialmente bajo su nombre artistico "${s(d.productora_nombre_artistico)}", por si o por terceros.`);

  addNumberedHanging('II)', 'Que la PRODUCTORA ha solicitado a la COLABORADORA que participe, en calidad de musica interprete y/o ejecutante en una o mas obras musicales (la/s Grabacion/es), las cuales se detallaran, o para su explotacion en forma de sencillo fonografico, incluyendo o no videoclip y/o materiales audiovisuales promocionales.');

  addNumberedHanging('III)', `Que la COLABORADORA, conocida artisticamente como "${s(d.colaboradora_nombre_artistico)}", es una interprete musical independiente, facultada para aceptar la propuesta de colaboracion de la PRODUCTORA, en los terminos que se diran, que no esta sujeta a contratos de exclusiva que se lo impidan o bien habiendo obtenido las autorizaciones pertinentes de terceros para su aceptacion y posterior cesion de derechos de propiedad intelectual sobre sus interpretaciones musicales.`);

  addNumberedHanging('IV)', 'Que la PRODUCTORA ha llevado a cabo la fijacion de las interpretaciones de la COLABORADORA en la/s Grabacion/es a satisfaccion de las Partes.');

  addParagraph('Con la finalidad de acordar los terminos y condiciones de la colaboracion entre las Partes y formalizar la cesion de los derechos de propiedad intelectual de la COLABORADORA a favor de la PRODUCTORA, las Partes celebran el presente contrato de Licencia de Derechos de Propiedad Intelectual y acuerdan regirse de conformidad a las siguientes');

  // CLÁUSULAS
  y += 4;
  addTitle('CLAUSULAS', 13);

  // 1. OBJETO
  addClauseTitle('1', 'OBJETO');

  addParagraph('1.1. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesion a terceros todos los derechos de propiedad intelectual que recaen sobre su interpretacion musical, fijada en la Grabacion que se detalla a continuacion:');

  addSubItem('a. Titulo de la obra Grabacion:', s(d.grabacion_titulo));
  addSubItem('b. Calidad en que interviene la COLABORADORA:', s(d.grabacion_calidad));
  addSubItem('c. Duracion de la Grabacion:', s(d.grabacion_duracion));
  addSubItem('d. Participacion (Si/No) en videoclip de la Grabacion:', s(d.grabacion_videoclip));
  addSubItem('e. Fecha de la fijacion:', s(d.grabacion_fecha_fijacion));

  addBoldInline('f. Caracter de la intervencion:', ` ${s(d.grabacion_caracter)}`, 15);

  addParagraph('1.2. La COLABORADORA cede a la PRODUCTORA, en exclusiva, con facultad de cesion a terceros todos los derechos que recaen sobre su imagen personal, incluyendo nombre civil o artistico, con proposito de mencion e informacion relacionada con la Grabacion, y, en especial los relativos a su imagen personal vinculada a su interpretacion en el caso de que exista una grabacion audiovisual (en la forma de un videoclip o similar) vinculada a la Grabacion.');

  // 2. ALCANCE
  addClauseTitle('2', 'ALCANCE DE LA CESION DE DERECHOS');

  addParagraph('2.1. El alcance de las cesiones de derechos de la COLABORADORA a favor de la PRODUCTORA que son objeto de este contrato, se conceden con la mayor amplitud y de forma ilimitada con la finalidad de que la PRODUCTORA pueda explotar la Grabacion, el Album, el videoclip y/o cualquier material promocional, publicitario y/o informativo que acompane a los mismos, en todos los formatos y sistemas de explotacion de musica y audiovisuales, a traves de todos los medios de explotacion que existan durante la vigencia de la presente cesion de derechos y sin mas limitaciones que las establecidas en el presente contrato.');

  addBoldInline('a. PERIODO:', 'A perpetuidad.', 15);
  addBoldInline('b. TERRITORIO:', 'El Universo.', 15);
  addBoldInline('c. MEDIOS:', 'Todos los medios existentes durante la vigencia de este contrato.', 15);

  addParagraph('2.2. La COLABORADORA cede a la PRODUCTORA, a titulo enunciativo, pero sin caracter limitativo, el derecho de reproduccion, distribucion, comunicacion publica y transformacion necesarios para la pacifica explotacion de la Grabacion y, en su caso, de los audiovisuales que la acompanen, quedando facultada la PRODUCTORA para contratar con terceros la explotacion de los mismos, transfiriendo a dichos terceros los mismos derechos y obligaciones que adquiere la PRODUCTORA en este contrato.');

  addParagraph('2.3. La PRODUCTORA se compromete a acreditar a la COLABORADORA de la siguiente forma, siguiendo los usos y costumbres del sector y segun las posibilidades de cada uno de los medios y sistemas de explotacion de la Grabacion, del Album y, en su caso, del videoclip:');

  addSubItem('a. Nombre artistico:', s(d.acreditacion_nombre));
  addSubItem('b. Caracter de la intervencion:', s(d.acreditacion_caracter));

  addParagraph(`2.4. Sin perjuicio de la cesion de derechos otorgada en este documento, la COLABORADORA podra acreditar su participacion en las entidades de gestion de derechos de propiedad intelectual de los artistas interpretes y ejecutantes, con relacion a la Grabacion y, en su caso, al videoclip, en calidad de (${s(d.calidad_entidad)}).`);

  addParagraph(`2.5. Queda expresamente acordado que la PRODUCTORA, por si o por terceros, podra explotar la Grabacion en forma de sencillo discografico o single; en forma de videoclip incluyendo o no la imagen de la COLABORADORA; en forma de fragmentos para su uso en teasers, trailers, piezas promocionales de la Grabacion, el videoclip o la carrera profesional de ${s(d.productora_nombre_artistico)}, y, con caracter general, de forma amplia siempre y cuando la interpretacion de la COLABORADORA forme parte de la Grabacion y no se utilice de forma independiente a esta y este relacionada con la explotacion, publicidad, promocion y/o comunicacion de la carrera y productos de ${s(d.productora_nombre_artistico)} y/o la PRODUCTORA.`);

  // 3. CONTRAPRESTACIÓN
  addClauseTitle('3', 'CONTRAPRESTACION');

  const royaltyNum = parseInt(d.royalty_porcentaje) || 0;
  const royaltyText = numberToSpanishText(royaltyNum) || s('');

  addParagraph(`3.1. En contraprestacion por la cesion de derechos que es objeto de este contrato y como remuneracion total por la participacion de la COLABORADORA en la Grabacion y, en su caso, el videoclip, la PRODUCTORA abonara a la COLABORADORA, por si o por terceros, un royalty de artista equivalente al ${royaltyText} POR CIENTO (${s(d.royalty_porcentaje)}%) de los ingresos que la PRODUCTORA obtenga por la explotacion de la Grabacion y, en su caso, del videoclip, independientemente de su procedencia. A estos efectos se considerara explotacion de la Grabacion todo acto de comercializacion que sea remunerado, incluyendo, para mayor claridad, los ingresos por venta de la Grabacion en formato digital y en formato fisico; los ingresos recibidos por el streaming de la Grabacion; los ingresos recibidos por el streaming del videoclip si lo hubiera; los ingresos recibidos de la explotacion en forma de sincronizacion de la Grabacion y, en general, todo acto de comercializacion de la Grabacion en el Territorio y durante el Periodo.`);

  addParagraph('3.2. En el caso de que posteriormente la Grabacion se incorpore a un album u otra compilacion, y los ingresos de la PRODUCTORA provengan de la explotacion de dicho album o compilacion, dichos ingresos seran repartidos entre el numero de grabaciones integrantes del mismo para calcular los ingresos correspondientes a la Grabacion y abonar el royalty de artista en consecuencia. La forma de calculo del royalty, en este caso, sera, por tanto, la de prorrata tituli (o partes iguales para cada uno de los titulos).');

  addParagraph('3.3. La PRODUCTORA sera la responsable del pago del royalty de artista a la COLABORADORA, si bien la PRODUCTORA podra encargar dicho pago a terceros a los que licencie la comercializacion y/o distribucion de la Grabacion, de forma temporal o permanente.');

  addParagraph('3.4. La frecuencia del pago del royalty de artista sera semestral, coincidiendo con los pagos que reciba la PRODUCTORA por parte de los terceros a quien licencie la comercializacion y/o distribucion del Album y la Grabacion y no se aplicaran descuentos por parte de la PRODUCTORA.');

  addParagraph('3.5. La PRODUCTORA emitira una liquidacion a favor de la COLABORADORA, que podria incluir importes negativos en el caso de que existieran devoluciones, y solicitara una factura a la COLABORADORA con la periodicidad detallada. Una vez la COLABORADORA haya emitido dicha factura, la PRODUCTORA la abonara en el transcurso de treinta (30) dias, a traves de transferencia bancaria a la cuenta de titularidad de la COLABORADORA que esta le indique.');

  // 4. NOTIFICACIONES
  addClauseTitle('4', 'NOTIFICACIONES');

  addParagraph('4.1. Las Partes han establecido como medio valido para el envio de cualquier comunicacion relacionada con el contenido de este contrato el envio de correos electronicos a las siguientes direcciones:');

  addSubItem('a. De la PRODUCTORA:', s(d.productora_email));
  addSubItem('b. De la COLABORADORA:', s(d.colaboradora_email));

  // 5. CONFIDENCIALIDAD
  addClauseTitle('5', 'CONFIDENCIALIDAD Y PROTECCION DE DATOS');

  addParagraph('5.1. Las Partes se comprometen a mantener en la mas estricta confidencialidad toda la informacion, tanto oral como escrita, que se haya puesto a disposicion de la otra parte, tanto con caracter previo a la firma de esta Licencia como mientras esta este vigente. Para ello, las Partes se comprometen a no hablar ni de forma directa ni indirecta de la informacion confidencial en ningun espacio publico o abierto al publico, ni a traves de terceros sin el consentimiento previo de la otra parte. No obstante, las Partes podran compartir la informacion confidencial que sea necesaria con asesores externos, abogados o contables, los cuales deberan tener suscrito un deber de confidencialidad que tenga por lo menos el alcance de esta clausula. La obligacion de mantener la informacion confidencial se establece sin ninguna limitacion temporal.');

  addParagraph('5.2. Asimismo, las Partes se comprometen a cumplir con la normativa vigente en materia de proteccion de datos, obligandose mutuamente a no utilizar los datos personales de la otra parte para finalidades diferentes o incompatibles con la de dar cumplimiento a lo dispuesto en esta Licencia. Los datos podran ser conservados durante el tiempo necesario para cumplir con posibles responsabilidades legales y fiscales. En caso de que, por el ambito territorial de esta Licencia, los datos deban transferirse a Terceros Paises, la PRODUCTORA se compromete a adoptar las medidas de seguridad que sean necesarias para impedir, dentro de sus posibilidades, el acceso a los datos personales a terceros no autorizados.');

  addParagraph('Las Partes podran ejercer sus derechos de acceso, oposicion, rectificacion, limitacion y portabilidad a traves del envio de correos electronicos a la direccion que consta en la Clausula de Notificaciones, debiendo aportar una fotocopia del DNI para poder verificar la identidad del remitente. Todo ello sin perjuicio del derecho a interponer una reclamacion ante la Agencia Espanola de Proteccion de Datos.');

  // 6. LEY APLICABLE
  addClauseTitle('6', 'LEY APLICABLE Y RESOLUCION DE CONFLICTOS');

  addParagraph('6.1. Esta Licencia se regira e interpretara de acuerdo con el ordenamiento juridico espanol y, en concreto, por lo dispuesto en la Ley de Propiedad Intelectual.');

  addParagraph('6.2. Ante cualquier incumplimiento, discrepancia o conflicto que pueda surgir entre las Partes, ambas se comprometen, en primer lugar, a intentar resolverlo de forma amistosa, otorgando a la otra parte un plazo de al menos diez (10) dias a contar desde la fecha en la que la parte perjudicada remita a la otra los motivos en los que se basa el incumplimiento o el conflicto. Una vez agotada la via amistosa, las Partes, con renuncia expresa a cualquier fuero que pudiere corresponderles, acuerdan someterse al Tribunal Arbitral de Barcelona (TAB).');

  y += 4;
  addParagraph('Y en senal de conformidad con lo previsto en este documento y para hacer efectiva la cesion de derechos que contiene esta Licencia, las Partes la firman por duplicado en el lugar y la fecha que consta en el encabezado de este documento.');

  // Signature block
  checkPage(50);
  y += 10;
  const colW = (cw - 20) / 2;
  
  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.text('La PRODUCTORA', ml + colW / 2, y, { align: 'center' });
  pdf.text('La COLABORADORA', ml + colW + 20 + colW / 2, y, { align: 'center' });
  
  y += 25;
  pdf.setDrawColor(0);
  pdf.line(ml, y, ml + colW, y);
  pdf.line(ml + colW + 20, y, ml + colW + 20 + colW, y);
  
  y += 6;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(11);
  pdf.text(s(d.firma_productora), ml + colW / 2, y, { align: 'center' });
  pdf.text(s(d.firma_colaboradora), ml + colW + 20 + colW / 2, y, { align: 'center' });

  addFooter();

  return pdf;
}

export function IPLicenseGenerator({ open, onOpenChange, onSave, releaseId }: IPLicenseGeneratorProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({ ...defaultData });
  const [manualTrack, setManualTrack] = useState(false);
  const { data: tracks = [] } = useTracks(releaseId);

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Auto-sync acreditacion_nombre when colaboradora_nombre_artistico changes
      if (field === 'colaboradora_nombre_artistico') {
        if (!prev.acreditacion_nombre || prev.acreditacion_nombre === prev.colaboradora_nombre_artistico) {
          next.acreditacion_nombre = value;
        }
      }
      // Auto-sync acreditacion_caracter when grabacion_caracter changes
      if (field === 'grabacion_caracter') {
        if (!prev.acreditacion_caracter || prev.acreditacion_caracter === prev.grabacion_caracter) {
          next.acreditacion_caracter = value;
        }
      }
      // Auto-sync firma_productora when productora_nombre changes
      if (field === 'productora_nombre') {
        if (!prev.firma_productora || prev.firma_productora === prev.productora_nombre) {
          next.firma_productora = value;
        }
      }
      // Auto-sync firma_colaboradora when colaboradora_nombre changes
      if (field === 'colaboradora_nombre') {
        if (!prev.firma_colaboradora || prev.firma_colaboradora === prev.colaboradora_nombre) {
          next.firma_colaboradora = value;
        }
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const pdf = generatePDF(formData);
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
  };

  const handlePreview = () => {
    const pdf = generatePDF(formData);
    const blobUrl = URL.createObjectURL(pdf.output('blob'));
    window.open(blobUrl, '_blank');
  };

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
            <div><Label>Nombre completo</Label><Input value={formData.productora_nombre} onChange={e => update('productora_nombre', e.target.value)} placeholder="Nombre legal de la productora" /></div>
            <div><Label>DNI/NIE/Pasaporte</Label><Input value={formData.productora_dni} onChange={e => update('productora_dni', e.target.value)} /></div>
            <div><Label>Domicilio</Label><Input value={formData.productora_domicilio} onChange={e => update('productora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.productora_nombre_artistico} onChange={e => update('productora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.productora_email} onChange={e => update('productora_email', e.target.value)} /></div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Datos del Colaborador/a</h3>
            <div><Label>Nombre completo</Label><Input value={formData.colaboradora_nombre} onChange={e => update('colaboradora_nombre', e.target.value)} /></div>
            <div><Label>DNI/NIE/Pasaporte</Label><Input value={formData.colaboradora_dni} onChange={e => update('colaboradora_dni', e.target.value)} /></div>
            <div><Label>Domicilio</Label><Input value={formData.colaboradora_domicilio} onChange={e => update('colaboradora_domicilio', e.target.value)} /></div>
            <div><Label>Nombre artístico</Label><Input value={formData.colaboradora_nombre_artistico} onChange={e => update('colaboradora_nombre_artistico', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.colaboradora_email} onChange={e => update('colaboradora_email', e.target.value)} /></div>
            
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Grabación y Derechos</h3>
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
                    if (track) {
                      update('grabacion_duracion', formatDuration(track.duration));
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
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Vista Previa y Firmas</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Productora:</strong> {formData.productora_nombre} ({formData.productora_nombre_artistico})</p>
              <p><strong>Colaborador/a:</strong> {formData.colaboradora_nombre} ({formData.colaboradora_nombre_artistico})</p>
              <p><strong>Sencillo:</strong> {formData.titulo_sencillo}</p>
              <p><strong>Grabación:</strong> {formData.grabacion_titulo} - {formData.grabacion_duracion}</p>
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
