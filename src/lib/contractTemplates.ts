// Contract template sections based on real booking contracts (MOODITA format)

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
  precioTickets: { tipo: string; precio: string }[];
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
  merchandisingDerechos: string;
  cancelacion: string;
  fuerzaMayor: string;
  jurisdiccion: string;
  confidencialidad: string;
  recinto: string;
  calidadEquipo: string;
  camerinos: string;
  riders: string;
  obligaciones: string;
  contratoFirme: string;
  impagoPenalizacion: string;
  noAnunciarSinPago: string;
  segurosIndemnidad: string;
  retrasos: string;
  ticketingReporting: string;
  invitaciones: string;
  liquidacionSGAE: string;
  porcentajeBeneficios: string;
  covid: string;
  certificadosSeguros: string;
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

  grabaciones: `No está permitido ningún acto de grabación o fijación del sonido y / o las imágenes, por cualquier medio audiovisual ni su comunicación pública por cualquier sistema o medio, de todo o parte de la actuación contratada y los ensayos, sin el consentimiento expreso y por escrito del Agente. El Promotor se obliga a tomar las medidas necesarias para impedir cualquier grabación no autorizada, incluyendo la colocación de avisos visibles en el recinto y la disponibilidad de personal para hacer cumplir esta prohibición. El incumplimiento de esta cláusula hará responsable al Promotor de los daños y perjuicios que se deriven.`,

  publicidad: `El Promotor se abstendrá de anunciar la actuación antes de haber obtenido el consentimiento expreso del AGENTE sobre el contenido de la publicidad y antes de haber efectuado el primer pago referido en las condiciones particulares. El Promotor está autorizado a utilizar el nombre del Artista para anunciar sus actuaciones, y se encargará de efectuar el máximo de publicidad y promoción de la actuación contratada, obligándose a respetar las indicaciones del Agente en cuanto a la imagen del Artista, título y material gráfico de la actuación, que deberá presentarlo al Agente para su aprobación expresa y por escrito.`,

  patrocinios: `El Promotor se abstendrá de realizar, por sí mismo o a través de terceros, cualquier acto que implique una asociación del nombre o la imagen del Artista con cualquier marca, y no permitirá que en cualquier punto del recinto, y en especial en el escenario, haya o se haga cualquier publicidad que no haya sido previamente acordada de forma expresa y por escrito con el AGENTE.`,

  merchandising: `El Promotor se obliga a no comprometer al Artista a ninguna entrevista, conferencia de prensa, recepción ni ninguna otra forma de aparición pública o promocional sin el previo consentimiento expreso y por escrito del Agente.`,

  merchandisingDerechos: `El Artista y/o el Agente se reservan el derecho exclusivo de venta de merchandising oficial del Artista en el recinto del evento. El Promotor proporcionará un espacio adecuado, visible y accesible para la venta de merchandising, libre de cargos. No se aplicará ningún porcentaje o comisión sobre las ventas de merchandising a favor del Promotor, salvo pacto expreso por escrito.`,

  recinto: `El Promotor se obliga a suministrar y pagar un equipo de sonido e iluminación de primera clase que contenga los elementos que constan en el RIDER TÉCNICO que se adjunta como ANEXO 1 a este contrato que forma parte integrante del mismo, o que será facilitado por el Agente al Promotor con antelación suficiente. En el supuesto en que el recinto esté al aire libre, el Promotor tomará las medidas necesarias para que el escenario esté suficientemente protegido de la lluvia y del viento. El Promotor se obliga a que el Artista disponga en el Recinto de camerinos según especificaciones del artista, de superficie razonable y acceso cercano a aseos individuales.`,

  calidadEquipo: `El Promotor acepta que el AGENTE, a su entera discreción, puede resolver este acuerdo sin responsabilidad de ningún tipo si, a la llegada del Artista y/o sus representantes, los equipos de sonido, iluminación o las condiciones del recinto no son de la calidad o tipo acordado en el Rider Técnico. En tal caso, el Promotor será responsable de pagar al Agente el precio completo estipulado en las condiciones particulares, además de los gastos incurridos.`,

  camerinos: `El Promotor se obliga a proporcionar camerinos cerrados con llave, de superficie razonable, con acceso cercano a aseos individuales, espejos, toallas limpias, y las condiciones de hospitalidad especificadas en el Rider de Hospitality. Asimismo, proporcionará un espacio de oficina o sala de trabajo para el Agente o Tour Manager, con acceso a WiFi y enchufes.`,

  riders: `El Promotor se obliga a cumplir con las especificaciones del ARTISTA y las partidas que constan en el RIDER TÉCNICO, que se adjunta como ANEXO 1 y que forma parte integrante de este contrato. El Promotor se obliga a reservar, contratar y pagar el hotel según las especificaciones del ARTISTA y las partidas que constan en el RIDER de HOSPITALITY, que se adjunta como ANEXO 2 que forma parte integrante de este contrato. El Agente y el Artista tendrán control creativo único y exclusivo sobre la producción y presentación de la actuación del ARTISTA.`,

  retrasos: `El AGENTE y el ARTISTA se reservan el derecho de reducir el tiempo establecido para la actuación del ARTISTA por el mismo tiempo en que se produzca cualquier retraso por parte del PROMOTOR que sea superior a treinta (30) minutos, manteniéndose en cualquier caso el importe íntegro del caché.`,

  obligaciones: `El Promotor se obliga a gestionar todos los permisos necesarios para las actuaciones del artista, y a cumplir con toda la normativa aplicable a la publicidad y celebración del concierto, así como la correspondiente a prevención de riesgos laborales. El Promotor facilitará las cartas de invitación necesarias para la obtención de los visados del grupo. El Promotor será responsable de cualquier sanción, multa o penalización impuesta por las autoridades competentes como consecuencia del incumplimiento de la normativa aplicable, comprometiéndose a indemnizar al Agente y al Artista por cualquier daño derivado. El Promotor se obliga a garantizar en todo momento la seguridad del Artista y su equipo, durante y después de la actuación, y será responsable de cualquier daño físico o material que sufran como consecuencia de una seguridad insuficiente.`,

  segurosIndemnidad: `El Promotor se obliga a garantizar al Agente y al Artista la prueba de que existe un seguro de responsabilidad civil conforme a las leyes que regulen las actuaciones en espacios públicos, designando al Artista y al Agente como asegurados o beneficiarios del seguro. El Promotor mantendrá indemne al Agente y al Artista frente a cualquier reclamación de terceros derivada del evento, incluyendo lesiones, daños materiales y reclamaciones laborales.`,

  certificadosSeguros: `El Agente podrá solicitar al Promotor, en cualquier momento previo a la actuación, la presentación de los certificados de seguro y los permisos necesarios para la celebración del evento. El incumplimiento de esta obligación será causa suficiente para la resolución inmediata del contrato, con derecho del Agente al cobro íntegro del caché y los gastos incurridos.`,

  cancelacion: `Si por cualquier causa o razón, incluyendo causas de fuerza mayor, el Promotor cancelase el EVENTO unilateralmente o la actuación del ARTISTA, éste se compromete a pagar, en concepto de daños y perjuicios al Agente la totalidad de los gastos incurridos más el 100% del caché garantizado. Si, por el contrario, fuese el AGENTE o el ARTISTA quien cancelase su actuación, sin causa que lo justifique, el AGENTE se compromete a devolver al PROMOTOR los importes que hubiese pagado hasta la fecha, siendo estos importes el límite de indemnización que el AGENTE deba pagar en caso de incumplimiento no justificado.`,

  fuerzaMayor: `Si la actuación del Artista se vuelve imposible, peligrosa o se dificulta de otra manera en virtud de cualquier circunstancia fuera del control de las Partes, incluyendo, entre otras, enfermedad, incapacidad para realizarla, accidente o en virtud de cualquier acto de fuerza mayor incluyendo pandemias, o cualquier acto u orden de cualquier autoridad pública, y / o cualquier otra causa o evento fuera del control del Artista, o si las condiciones climáticas hacen imposible llevar a cabo la actuación, el Artista no tendrá ninguna responsabilidad ante el Promotor en relación con ello. Siempre que el Artista esté listo, dispuesto y en condiciones de actuar, el Promotor seguirá siendo responsable de pagar al Artista la remuneración completa.`,

  covid: `En caso de que restricciones sanitarias, pandemias o medidas gubernamentales impidan o limiten sustancialmente la celebración del evento, las Partes se comprometen a renegociar de buena fe las condiciones del contrato en un plazo máximo de 15 días. Si no se alcanza un acuerdo, cualquiera de las Partes podrá resolver el contrato. En caso de resolución, el Agente devolverá los importes recibidos, descontados los gastos efectivamente incurridos y debidamente justificados.`,

  ticketingReporting: `El Promotor se obliga a facilitar al Agente reportes semanales de venta de entradas desde el inicio de la venta anticipada. El Promotor se compromete a no permitir la reventa de entradas por encima de su precio nominal y a tomar las medidas necesarias para controlar la reventa secundaria no autorizada.`,

  invitaciones: `El Promotor proporcionará un mínimo de 10 entradas gratuitas para invitados del Artista, salvo que se acuerde un número diferente en las condiciones particulares.`,

  liquidacionSGAE: `Dentro de los quince días siguientes a la finalización del EVENTO, el Promotor se obliga a facilitar al Agente una copia de la liquidación a SGAE por comunicación pública de obras musicales.`,

  porcentajeBeneficios: `En el caso de que se hubiese pactado un porcentaje sobre los beneficios del evento, el Promotor deberá justificar debidamente todos los costes del evento mediante la presentación de facturas originales al Agente, quien tendrá derecho a auditarlas.`,

  contratoFirme: `El primer pago efectuado por el Promotor al Agente, sin que el mismo objete nada transcurridos 7 días desde su recepción, implicará acuerdo firme sobre los términos del presente contrato, incluso sin que el mismo haya llegado a ser firmado. El incumplimiento del calendario de pagos es causa suficiente para que el ARTISTA cancele la actuación, quedando el PROMOTOR obligado al pago del 100% del caché más los gastos originados.`,

  impagoPenalizacion: `El incumplimiento por parte del Promotor de cualquiera de los plazos de pago establecidos en las condiciones particulares facultará al Agente para resolver el contrato de forma inmediata, con derecho al cobro íntegro del caché garantizado más todos los gastos incurridos hasta la fecha de resolución.`,

  noAnunciarSinPago: `El Promotor no podrá anunciar la actuación, iniciar la venta de entradas ni realizar ningún acto de publicidad o promoción del evento hasta haber efectuado el primer pago referido en las condiciones particulares y haber obtenido la aprobación expresa del Agente sobre el material publicitario. El incumplimiento de esta cláusula facultará al Agente para resolver el contrato y reclamar los daños y perjuicios correspondientes.`,

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

DE UNA PARTE:

${agent.representante}, en nombre y representación como Administrador de la sociedad ${agent.nombre}, con C.I.F. número ${agent.cif} con domicilio social ${agent.direccion} (en lo sucesivo, EL AGENTE).

DE LA OTRA:

${promoter.representante}${promoter.cargo ? `, en calidad de ${promoter.cargo},` : ''} en nombre y representación de ${promoter.nombre}${promoter.cif ? `, con C.I.F número ${promoter.cif}` : ''}${promoter.direccion ? ` con domicilio social ${promoter.direccion}` : ''} (en lo sucesivo, EL PROMOTOR).

PACTAN:

El compromiso de actuación del artista en las condiciones particulares y generales detalladas a continuación y en sus correspondientes Anexos.

CONDICIONES PARTICULARES

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

DURACIÓN ACTUACIÓN:
${conditions.duracion}

HORARIOS:
- MONTAJE Y PRUEBA SONIDO: ${conditions.montajePrueba || 'TBC'}
- APERTURA PUERTAS: ${conditions.aperturaPuertas || 'TBC'}
- INICIO CONCIERTO: ${conditions.inicioConcierto}
- CURFEW: ${conditions.curfew || 'TBC'}

CACHÉ GARANTIZADO:
${conditions.cacheGarantizado}${conditions.comisionAgencia ? ` (${conditions.comisionAgencia} Comisión Agencia incluida)` : ''}

PRECIO TICKETS:
${conditions.precioTickets.length > 0 ? conditions.precioTickets.map(p => `- ${p.tipo}: ${p.precio}`).join('\n') : 'TBC'}

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

Datos bancarios del AGENTE:
Banco: ${agent.banco}
IBAN: ${agent.iban}
Titular: ${agent.nombre}

${clauses.contratoFirme}

El CONTRATO está formado por estas CONDICIONES PARTICULARES, las CONDICIONES GENERALES que siguen y los RIDERS anexos. En caso de contradicciones entre los términos de las CONDICIONES GENERALES y los RIDERS, prevalecerá lo establecido en los RIDERS.

CONDICIONES GENERALES

1. OBJETO DEL CONTRATO Y DERECHOS DE PROPIEDAD INTELECTUAL

1.1.
${clauses.propiedadIntelectual}

1.2.
${clauses.grabaciones}

2. DERECHOS DE IMAGEN; PUBLICIDAD, PATROCINIO Y MERCHANDISING

2.1.
${clauses.publicidad}

2.2.
${clauses.noAnunciarSinPago}

2.3.
${clauses.patrocinios}

2.4.
${clauses.merchandising}

2.5. MERCHANDISING
${clauses.merchandisingDerechos}

3. RECINTO, ESCENARIO Y CAMERINOS

3.1.
${clauses.recinto}

3.2.
${clauses.calidadEquipo}

3.3. CAMERINOS
${clauses.camerinos}

4. RIDERS TÉCNICO Y HOSPITALITY - CONTROL CREATIVO Y TIEMPO DE ACTUACIÓN

4.1.
${clauses.riders}

4.2. RETRASOS
${clauses.retrasos}

5. OTRAS OBLIGACIONES DEL PROMOTOR

5.1.
${clauses.obligaciones}

5.2. SEGUROS E INDEMNIDAD
${clauses.segurosIndemnidad}

5.3. CERTIFICADOS DE SEGUROS
${clauses.certificadosSeguros}

5.4. CANCELACIÓN
${clauses.cancelacion}

5.5. FUERZA MAYOR
${clauses.fuerzaMayor}

5.6. RESTRICCIONES SANITARIAS
${clauses.covid}

5.7. IMPAGO Y PENALIZACIÓN
${clauses.impagoPenalizacion}

5.8. TICKETING Y REPORTING
${clauses.ticketingReporting}

5.9. INVITACIONES
${clauses.invitaciones}

5.10. LIQUIDACIÓN SGAE
${clauses.liquidacionSGAE}

5.11. PORCENTAJE SOBRE BENEFICIOS
${clauses.porcentajeBeneficios}

6. EFECTIVIDAD DEL CONTRATO

Las partes aceptan expresamente que el hecho de que el Promotor anuncie públicamente la celebración de la actuación que es el objeto de este contrato será interpretado como una aceptación de todos los términos y condiciones del presente contrato, produciendo éste plenos efectos entre las partes. Los cambios, enmiendas o modificaciones que el Promotor haga por escrito en el contrato y los Riders no producirán efecto alguno hasta que sean aprobados por el Agente por escrito.

7. CONFIDENCIALIDAD

${clauses.confidencialidad}

8. LEY Y JURISDICCIÓN

${clauses.jurisdiccion}

Y en prueba de su conformidad, firman el presente contrato y sus anexos, por duplicado y a un solo efecto, en el lugar y fecha arriba indicados.


EL AGENTE                                          EL PROMOTOR


_________________________                          _________________________
${agent.representante}                              ${promoter.representante}
${agent.nombre}                                     ${promoter.nombre}
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
