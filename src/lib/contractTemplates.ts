// Contract template sections based on real booking contracts (Cityzen format)

export interface AgentData {
  nombre: string;
  cif: string;
  direccion: string;
  representante: string;
  banco: string;
  iban: string;
}

export interface PromoterData {
  contactId?: string;
  nombre: string;
  cif: string;
  direccion: string;
  representante: string;
  cargo: string;
}

export interface ContractConditions {
  artista: string;
  ciudad: string;
  aforo: string;
  recinto: string;
  evento: string;
  billing: string;
  otrosArtistas: string;
  fechaAnuncio: string;
  fechaActuacion: string;
  duracion: string;
  montajePrueba: string;
  aperturaPuertas: string;
  inicioConcierto: string;
  curfew: string;
  cacheGarantizado: string;
  comisionAgencia: string;
  precioTickets: string;
  sponsors: string;
  riderTecnico: boolean;
  riderHospitalidad: string;
  hoteles: boolean;
  transporteInterno: boolean;
  vuelos: boolean;
  backline: boolean;
}

export interface PaymentTerms {
  tipo: 'post-concierto' | '50-50' | 'personalizado';
  primerPagoPorcentaje?: number;
  primerPagoMomento?: string;
  segundoPagoPorcentaje?: number;
  segundoPagoMomento?: string;
  condicionesAdicionales?: string;
}

export interface LegalClauses {
  propiedadIntelectual: string;
  grabaciones: string;
  publicidad: string;
  patrocinios: string;
  merchandising: string;
  cancelacion: string;
  fuerzaMayor: string;
  jurisdiccion: string;
  confidencialidad: string;
  recinto: string;
  riders: string;
  obligaciones: string;
}

export const DEFAULT_AGENT_DATA: AgentData = {
  nombre: "CIUDAD ZEN MUSICAS S.L.",
  cif: "B85650505",
  direccion: "C/Carretas 14, 2ºi, 28012, Madrid, España",
  representante: "Marco Perales Rodríguez",
  banco: "BANCO SANTANDER",
  iban: "ES9700492663352114253471"
};

export const DEFAULT_LEGAL_CLAUSES: LegalClauses = {
  propiedadIntelectual: `El objeto del presente Contrato es exclusivamente la actuación del Artista. No incluye la cesión o licencia de ningún derecho de propiedad intelectual, modalidad o acto de explotación sobre la actuación contratada, quedando expresamente reservados todos los derechos sobre la misma a favor del Artista.`,
  grabaciones: `No está permitido ningún acto de grabación o fijación del sonido y / o las imágenes, por cualquier medio audiovisual ni su comunicación pública por cualquier sistema o medio, de todo o parte de la actuación contratada y los ensayos, sin el consentimiento expreso y por escrito del Agente.`,
  publicidad: `El promotor se abstendrá de anunciar la actuación antes de haber obtenido el consentimiento expreso del AGENTE sobre el contenido de la publicidad. El Promotor está autorizado a utilizar el nombre del Artista para anunciar sus actuaciones, y se encargará de efectuar el máximo de publicidad y promoción de la actuación contratada, obligándose a respetar las indicaciones del Agente en cuanto a la imagen del Artista, título y material gráfico de la actuación, que deberá presentarlo al Agente para su aprobación expresa y por escrito.`,
  patrocinios: `El Promotor se abstendrá de realizar, por sí mismo o a través de terceros, cualquier acto que implique una asociación del nombre o la imagen del Artista con cualquier marca, y no permitirá que en cualquier punto del recinto, y en especial en el escenario, haya o se haga cualquier publicidad que no haya sido previamente acordada de forma expresa y por escrito con el AGENTE.`,
  merchandising: `El Promotor se obliga a no comprometer al Artista a ninguna entrevista, conferencia de prensa, recepción ni ninguna otra forma de aparición pública o promocional sin el previo consentimiento expreso y por escrito del Agente.`,
  recinto: `El Promotor se obliga a suministrar y pagar un equipo de sonido e iluminación de primera clase que contenga los elementos que constan en el RIDER TÉCNICO que se adjunta como ANEXO 1 a este contrato que forma parte integrante del mismo, o que será facilitado por el Agente al Promotor con antelación suficiente. En el supuesto en que el recinto esté al aire libre, el Promotor tomará las medidas necesarias para que el escenario esté suficientemente protegido de la lluvia y del viento. El promotor se obliga a que el Artista disponga en el Recinto de camerinos según especificaciones del artista, de superficie razonable y acceso cercano a aseos individuales.`,
  riders: `El Promotor se obliga a cumplir con las especificaciones del ARTISTA y las partidas que constan en el RIDER TÉCNICO, que se adjunta como ANEXO 1 y que forma parte integrante de este contrato. El Promotor se obliga a reservar, contratar y pagar el hotel según las especificaciones del ARTISTA y las partidas que constan en el RIDER de HOSPITALITY, que se adjunta como ANEXO 2 que forma parte integrante de este contrato. El Agente y el Artista tendrán control creativo único y exclusivo sobre la producción y presentación de la actuación del ARTISTA.`,
  obligaciones: `El Promotor se obliga a gestionar todos los permisos necesarios para las actuaciones del artista, y a cumplir con toda la normativa aplicable a la publicidad y celebración del concierto, así como la correspondiente a prevención de riesgos laborales. El Promotor facilitará las cartas de invitación necesarias para la obtención de los visados del grupo. El Promotor se obliga a garantizar en todo momento la seguridad del Artista y su equipo, durante y después de la actuación.`,
  cancelacion: `Si por cualquier causa o razón, incluyendo causas de fuerza mayor, el Promotor cancelase el EVENTO unilateralmente o la actuación del ARTISTA, éste se compromete a pagar, en concepto de daños y perjuicios al Agente la totalidad de los gastos incurridos. Si, por el contrario, fuese el AGENTE o el ARTISTA quien cancelase su actuación, sin causa que lo justifique, el AGENTE se compromete a devolver al PROMOTOR los importes que hubiese pagado hasta la fecha, siendo estos importes el límite de indemnización que el AGENTE deba pagar en caso de incumplimiento no justificado.`,
  fuerzaMayor: `Si la actuación del Artista se vuelve imposible, peligrosa o se dificulta de otra manera en virtud de cualquier circunstancia fuera del control de las Partes, incluyendo, entre otras, enfermedad, incapacidad para realizarla, accidente o en virtud de cualquier acto de fuerza mayor incluyendo pandemias, o cualquier acto u orden de cualquier autoridad pública, y / o cualquier otra causa o evento fuera del control del Artista, o si las condiciones climáticas hacen imposible llevar a cabo la actuación, el Artista no tendrá ninguna responsabilidad ante el Promotor en relación con ello. Siempre que el Artista esté listo, dispuesto y en condiciones de actuar, el Promotor seguirá siendo responsable de pagar al Artista la remuneración completa.`,
  confidencialidad: `El Promotor se compromete a mantener confidencial y no dar a conocer a terceros el contenido del presente contrato, en especial, lo que refiere a las condiciones económicas de la actuación, tomando cuantas medidas sean necesarias para ello.`,
  jurisdiccion: `El presente contrato se sujetará a la ley española. Cualquier duda o divergencia derivada de su interpretación o cumplimiento se someterá a los juzgados y tribunales de Madrid.`
};

export const generateContractDocument = (
  agent: AgentData,
  promoter: PromoterData,
  conditions: ContractConditions,
  payment: PaymentTerms,
  clauses: LegalClauses,
  contractDate: string
): string => {
  const paymentText = generatePaymentText(payment);
  
  return `CONTRATO CON PROMOTOR PARA LA ACTUACIÓN PÚBLICA DE ARTISTA

En ${agent.direccion.split(',').pop()?.trim() || 'Madrid'}, el ${contractDate}.

${agent.representante}, en nombre y representación como Administrador de la sociedad ${agent.nombre}, con C.I.F. número ${agent.cif} con domicilio social ${agent.direccion} (en lo sucesivo, EL PROMOTOR).

Y de la otra, ${promoter.nombre} con C.I.F número ${promoter.cif} con domicilio social ${promoter.direccion} (en lo sucesivo, EL AGENTE)

PACTAN:

El compromiso de actuación del artista en las condiciones particulares y generales detalladas a continuación y en sus correspondientes Anexos.

ARTISTA:
${conditions.artista}

CIUDAD:
${conditions.ciudad}

AFORO:
${conditions.aforo}

RECINTO:
${conditions.recinto}

EVENTO:
${conditions.evento}

BILLING:
${conditions.billing}

OTROS ARTISTAS/DJs:
${conditions.otrosArtistas || 'SIN ESPECIFICAR'}

FECHA ANUNCIO:
${conditions.fechaAnuncio || 'TBC'}

FECHA ACTUACIÓN:
${conditions.fechaActuacion}

DURACION ACTUACIÓN:
${conditions.duracion}

HORARIOS:
- MONTAJE Y PRUEBA SONIDO: ${conditions.montajePrueba || 'TBC'}
- APERTURA PUERTAS: ${conditions.aperturaPuertas || 'TBC'}
- INICIO CONCIERTO: ${conditions.inicioConcierto}
- CURFEW: ${conditions.curfew || 'TBC'}

CACHÉ GARANTIZADO:
${conditions.cacheGarantizado}${conditions.comisionAgencia ? ` (${conditions.comisionAgencia} Comisión Agencia incluida)` : ''}

PRECIO TICKETS
${conditions.precioTickets || 'TBC'}

SPONSORS:
${conditions.sponsors || 'No, y nunca en caja escénica del escenario sin previo acuerdo del artista'}

- RIDER TÉCNICO: ${conditions.riderTecnico ? 'SI' : 'NO'}
- RIDER HOSPITALIDAD: ${conditions.riderHospitalidad || 'Catering de cortesía'}
- HOTELES: ${conditions.hoteles ? 'SI' : 'NO'}
- TRANSPORTE INTERNO: ${conditions.transporteInterno ? 'SI' : 'NO'}
- VUELOS: ${conditions.vuelos ? 'SI' : 'NO'}
- BACKLINE: ${conditions.backline ? 'SI' : 'NO'}

FORMA DE PAGO:
${paymentText}

El CONTRATO está formado por estas CONDICIONES PARTICULARES, las CONDICIONES GENERALES que siguen y los RIDERS anexos. En caso de contradicciones entre los términos de las CONDICIONES GENERALES y los RIDERS, prevalecerá lo establecido en los RIDERS.

1. OBJETO DEL CONTRATO Y DERECHOS DE PROPIEDAD INTELECTUAL

1.1.
${clauses.propiedadIntelectual}

1.2.
${clauses.grabaciones}

2. DERECHOS DE IMAGEN; PUBLICIDAD, PATROCINIO Y MERCHANDISING

2.1.
${clauses.publicidad}

2.2.
${clauses.patrocinios}

2.3.
${clauses.merchandising}

3. RECINTO, ESCENARIO Y CAMERINOS

3.1.
${clauses.recinto}

4. RIDERS TÉCNICO Y HOSPITALITY – CONTROL CREATIVO Y TIEMPO DE ACTUACIÓN

4.1.
${clauses.riders}

5. OTRAS OBLIGACIONES

5.1.
${clauses.obligaciones}

5.2.
${clauses.cancelacion}

5.3.
${clauses.fuerzaMayor}

Dentro de los quince días siguientes a la finalización del EVENTO, el Promotor se obliga a facilitar al Agente una copia de la liquidación a SGAE por comunicación pública de obras musicales.

6. EFECTIVIDAD DEL CONTRATO

Las partes aceptan expresamente que el hecho de que el Promotor anuncie públicamente la celebración de la actuación que es el objeto de este contrato será interpretado como una aceptación de todos los términos y condiciones del presente contrato, produciendo éste plenos efectos entre las partes. Los cambios, enmiendas o modificaciones que el Promotor haga por escrito en el contrato y los Riders no producirán efecto alguno hasta que sean aprobados por el Agente por escrito.

7. CONFIDENCIALIDAD

${clauses.confidencialidad}

8. LEY Y JURISDICCIÓN

${clauses.jurisdiccion}

Y en prueba de su conformidad, firman el presente contrato y sus anexos, por duplicado y a un solo efecto, en el lugar y fecha arriba indicados.

EL PROMOTOR                                    EL AGENTE
${agent.representante}                         

${agent.nombre}
CIF: ${agent.cif}
`;
};

const generatePaymentText = (payment: PaymentTerms): string => {
  switch (payment.tipo) {
    case 'post-concierto':
      return '- A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.';
    case '50-50':
      return `- 50% A la firma del presente contrato
- 50% El día hábil después de la actuación.`;
    case 'personalizado':
      let text = '';
      if (payment.primerPagoPorcentaje && payment.primerPagoMomento) {
        text += `- ${payment.primerPagoPorcentaje}% ${payment.primerPagoMomento}\n`;
      }
      if (payment.segundoPagoPorcentaje && payment.segundoPagoMomento) {
        text += `- ${payment.segundoPagoPorcentaje}% ${payment.segundoPagoMomento}`;
      }
      if (payment.condicionesAdicionales) {
        text += `\n\n${payment.condicionesAdicionales}`;
      }
      return text || '- Condiciones de pago a acordar';
    default:
      return '- A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.';
  }
};
