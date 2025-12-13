// Contract template sections based on real booking contracts

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
  grabaciones: `No está permitido ningún acto de grabación o fijación del sonido y / o las imágenes, por cualquier medio audiovisual ni su comunicación pública por cualquier sistema o medio, de todo o parte de la actuación contratada y los ensayos, sin el consentimiento expreso y por escrito del Agente. El Promotor se compromete a adoptar las medidas necesarias para hacer cumplir esta disposición por el público.`,
  publicidad: `El promotor se abstendrá de anunciar la actuación antes de haber efectuado el primer pago referido en las condiciones particulares, y de haber obtenido el consentimiento expreso del AGENTE sobre el contenido de la publicidad. El Promotor está autorizado a utilizar el nombre del Artista para anunciar sus actuaciones, y se encargará de efectuar el máximo de publicidad y promoción de la actuación contratada.`,
  patrocinios: `El Promotor se abstendrá de realizar, por sí mismo o a través de terceros, cualquier acto que implique una asociación del nombre o la imagen del Artista con cualquier marca, y no permitirá que en cualquier punto del recinto, y en especial en el escenario, haya o se haga cualquier publicidad que no haya sido previamente acordada de forma expresa y por escrito con el AGENTE.`,
  merchandising: `El Promotor se obliga a no comprometer al Artista a ninguna entrevista, conferencia de prensa, recepción ni ninguna otra forma de aparición pública o promocional sin el previo consentimiento expreso y por escrito del Agente.`,
  cancelacion: `Si el Promotor cancela la actuación, deberá abonar al Agente la totalidad del caché acordado. Si la cancelación se produce por causas imputables al Artista, el Agente devolverá los pagos recibidos. El incumplimiento del calendario de pagos es causa suficiente para que el ARTISTA cancele la actuación quedando el PROMOTOR obligado al pago del 100% del caché más los gastos originados.`,
  fuerzaMayor: `Ninguna de las partes será responsable por incumplimiento debido a causas de fuerza mayor, incluyendo pero no limitado a: desastres naturales, pandemias, guerras, actos de terrorismo, o cualquier otra circunstancia fuera del control razonable de las partes.`,
  jurisdiccion: `Para cualquier controversia que pudiera surgir de la interpretación o ejecución del presente contrato, las partes se someten a los Juzgados y Tribunales de Madrid, renunciando expresamente a cualquier otro fuero que pudiera corresponderles.`
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

${agent.representante}, en nombre y representación como Administrador de la sociedad ${agent.nombre}, con C.I.F. número ${agent.cif} con domicilio social ${agent.direccion} (en lo sucesivo, EL AGENTE).

Y de la otra, ${promoter.representante}${promoter.cargo ? `, ${promoter.cargo}` : ''}, en nombre y representación de ${promoter.nombre}, con C.I.F. número ${promoter.cif} con domicilio social ${promoter.direccion} (en lo sucesivo, EL PROMOTOR).

PACTAN:

El compromiso de actuación del artista en las condiciones particulares y generales detalladas a continuación y en sus correspondientes Anexos.

═══════════════════════════════════════════════════════════════
                    CONDICIONES PARTICULARES
═══════════════════════════════════════════════════════════════

ARTISTA: ${conditions.artista}
CIUDAD: ${conditions.ciudad}
AFORO: ${conditions.aforo}
RECINTO: ${conditions.recinto}
EVENTO: ${conditions.evento}
BILLING: ${conditions.billing}
OTROS ARTISTAS/DJs: ${conditions.otrosArtistas || 'SIN ESPECIFICAR'}
FECHA ANUNCIO: ${conditions.fechaAnuncio || 'TBC'}
FECHA ACTUACIÓN: ${conditions.fechaActuacion}
DURACIÓN ACTUACIÓN: ${conditions.duracion}

HORARIOS:
• MONTAJE Y PRUEBA SONIDO: ${conditions.montajePrueba || 'TBC'}
• APERTURA PUERTAS: ${conditions.aperturaPuertas || 'TBC'}
• INICIO CONCIERTO: ${conditions.inicioConcierto}
• CURFEW: ${conditions.curfew || 'TBC'}

CACHÉ GARANTIZADO: ${conditions.cacheGarantizado}${conditions.comisionAgencia ? ` (${conditions.comisionAgencia} Comisión Agencia incluida)` : ''}
PRECIO TICKETS: ${conditions.precioTickets || 'TBC'}
SPONSORS: ${conditions.sponsors || 'No, y nunca en caja escénica del escenario sin previo acuerdo del artista'}

RIDER TÉCNICO: ${conditions.riderTecnico ? 'SÍ' : 'NO'}
RIDER HOSPITALIDAD: ${conditions.riderHospitalidad || 'Catering de cortesía'}
HOTELES: ${conditions.hoteles ? 'SÍ' : 'NO'}
TRANSPORTE INTERNO: ${conditions.transporteInterno ? 'SÍ' : 'NO'}
VUELOS: ${conditions.vuelos ? 'SÍ' : 'NO'}
BACKLINE: ${conditions.backline ? 'SÍ' : 'NO'}

═══════════════════════════════════════════════════════════════
                      FORMA DE PAGO
═══════════════════════════════════════════════════════════════

${paymentText}

Los pagos se harán mediante transferencia a la siguiente cuenta bancaria:

Titular: ${agent.nombre}
Banco: ${agent.banco}
Nº de Cuenta IBAN: ${agent.iban}

El CONTRATO está formado por estas CONDICIONES PARTICULARES, las CONDICIONES GENERALES que siguen y los RIDERS anexos. En caso de contradicciones entre los términos de las CONDICIONES GENERALES y los RIDERS, prevalecerá lo establecido en los RIDERS.

═══════════════════════════════════════════════════════════════
                    CONDICIONES GENERALES
═══════════════════════════════════════════════════════════════

1. OBJETO DEL CONTRATO Y DERECHOS DE PROPIEDAD INTELECTUAL

1.1. ${clauses.propiedadIntelectual}

1.2. ${clauses.grabaciones}

2. DERECHOS DE IMAGEN; PUBLICIDAD, PATROCINIO Y MERCHANDISING

2.1. ${clauses.publicidad}

2.2. ${clauses.patrocinios}

2.3. ${clauses.merchandising}

3. CANCELACIÓN

3.1. ${clauses.cancelacion}

4. FUERZA MAYOR

4.1. ${clauses.fuerzaMayor}

5. JURISDICCIÓN

5.1. ${clauses.jurisdiccion}

═══════════════════════════════════════════════════════════════

Y para que conste a los efectos oportunos, las partes firman el presente contrato por duplicado en la fecha y lugar indicados.


Por EL AGENTE:                          Por EL PROMOTOR:


_________________________              _________________________
${agent.representante}                  ${promoter.representante}
${agent.nombre}                         ${promoter.nombre}
`;
};

const generatePaymentText = (payment: PaymentTerms): string => {
  switch (payment.tipo) {
    case 'post-concierto':
      return '• A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.';
    case '50-50':
      return `• 50% A la firma del presente contrato
• 50% El día hábil después de la actuación.`;
    case 'personalizado':
      let text = '';
      if (payment.primerPagoPorcentaje && payment.primerPagoMomento) {
        text += `• ${payment.primerPagoPorcentaje}% ${payment.primerPagoMomento}\n`;
      }
      if (payment.segundoPagoPorcentaje && payment.segundoPagoMomento) {
        text += `• ${payment.segundoPagoPorcentaje}% ${payment.segundoPagoMomento}`;
      }
      if (payment.condicionesAdicionales) {
        text += `\n\n${payment.condicionesAdicionales}`;
      }
      return text || '• Condiciones de pago a acordar';
    default:
      return '• A pagar por transferencia bancaria, 100% el día posterior al concierto, previa presentación de factura.';
  }
};
