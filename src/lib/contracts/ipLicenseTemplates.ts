// IP License clause templates — bilingual (ES/EN) and per recording type (single/album)
// Placeholders: {{calidad_entidad}}, {{productora_nombre_artistico}}, {{royalty_texto}},
//               {{royalty_porcentaje}}, {{grabacion_titulo}}, {{productora_email}}, {{colaboradora_email}}

export type IPLicenseLanguage = 'es' | 'en';
export type IPLicenseRecordingType = 'single' | 'album';

export interface IPLegalClauses {
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

// =================================================================
// SPANISH — SINGLE (current default, kept verbatim)
// =================================================================
export const IP_CLAUSES_ES_SINGLE: IPLegalClauses = {
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

// =================================================================
// SPANISH — ALBUM (variant: mentions "Álbum" instead of "Sencillo")
// =================================================================
export const IP_CLAUSES_ES_ALBUM: IPLegalClauses = {
  ...IP_CLAUSES_ES_SINGLE,
  alcance_2_1: '2.1. El alcance de las cesiones de derechos de la COLABORADORA a favor de la PRODUCTORA que son objeto de este contrato, se conceden con la mayor amplitud y de forma ilimitada con la finalidad de que la PRODUCTORA pueda explotar la Grabación, el Álbum, el videoclip y/o cualquier material promocional, publicitario y/o informativo que acompañe a los mismos, en todos los formatos y sistemas de explotación de música y audiovisuales, a través de todos los medios de explotación que existan durante la vigencia de la presente cesión de derechos y sin más limitaciones que las establecidas en el presente contrato.',
  alcance_2_3: '2.3. La PRODUCTORA se compromete a acreditar a la COLABORADORA de la siguiente forma, siguiendo los usos y costumbres del sector y según las posibilidades de cada uno de los medios y sistemas de explotación de la Grabación, del Álbum y, en su caso, del videoclip:',
  alcance_2_5: '2.5. Queda expresamente acordado que la PRODUCTORA, por sí o por terceros, podrá explotar la Grabación de forma independiente —sencillo discográfico o single—; como parte integrante del Álbum; en forma de videoclip incluyendo o no la imagen de la COLABORADORA; en forma de fragmentos para su uso en teasers, trailers, piezas promocionales del Álbum, la Grabación, el videoclip o la carrera profesional de {{productora_nombre_artistico}}, y, con carácter general, de forma amplia siempre y cuando la interpretación de la COLABORADORA forme parte de la Grabación y no se utilice de forma independiente a esta y esté relacionada con la explotación, publicidad, promoción y/o comunicación de la carrera y productos de {{productora_nombre_artistico}} y/o la PRODUCTORA.',
  contraprestacion_3_2: '3.2. En el caso de que los ingresos de la PRODUCTORA provengan de la explotación del Álbum que incorpora la Grabación, dichos ingresos serán repartidos entre el número de grabaciones integrantes del mismo para calcular los ingresos correspondientes a la Grabación y abonar el royalty de artista en consecuencia. La forma de cálculo del royalty, en este caso, será, por tanto, la de prorrata tituli (o partes iguales para cada uno de los títulos).',
  contraprestacion_3_4: '3.4. La frecuencia del pago del royalty de artista será semestral, coincidiendo con los pagos que reciba la PRODUCTORA por parte de los terceros a quien licencie la comercialización y/o distribución del Álbum y la Grabación y no se aplicarán descuentos por parte de la PRODUCTORA.',
};

// =================================================================
// ENGLISH — SINGLE
// =================================================================
export const IP_CLAUSES_EN_SINGLE: IPLegalClauses = {
  objeto_1_1: '1.1. The COLLABORATOR assigns to the PRODUCER, on an exclusive basis, with the right to sublicense to third parties, all intellectual property rights relating to their musical performance, fixed in the Recording detailed below:',
  objeto_1_2: '1.2. The COLLABORATOR assigns to the PRODUCER, on an exclusive basis, with the right to sublicense to third parties, all rights relating to their personal image, including civil or artistic name, for the purpose of mention and information related to the Recording, and, in particular, those relating to their personal image linked to their performance in the event that there is an audiovisual recording (in the form of a music video or similar) linked to the Recording.',
  alcance_2_1: '2.1. The scope of the COLLABORATOR\u2019s rights assignments in favor of the PRODUCER that are the subject of this agreement are granted in the broadest manner and without limitations, so that the PRODUCER may exploit the Recording, the Single, the music video and/or any promotional, advertising and/or informational material accompanying them, in all formats and systems for exploiting music and audiovisual works, through all means of exploitation that exist during the term of this rights assignment and with no further limitations than those established in this agreement.',
  alcance_2_2: '2.2. The COLLABORATOR assigns to the PRODUCER, by way of illustration but not limitation, the rights of reproduction, distribution, public communication, and transformation necessary for the peaceful exploitation of the Recording and, where applicable, the audiovisual works accompanying it, the PRODUCER being authorized to contract with third parties the exploitation thereof, transferring to said third parties the same rights and obligations that the PRODUCER acquires under this agreement.',
  alcance_2_3: '2.3. The PRODUCER undertakes to credit the COLLABORATOR in the following manner, following the customary practices of the industry and according to the possibilities of each of the means and systems for exploiting the Recording, the Single and, where applicable, the music video:',
  alcance_2_4: '2.4. Notwithstanding the rights assignment granted in this document, the COLLABORATOR may register their participation with the collective management organizations for the intellectual property rights of performing artists, in relation to the Recording and, where applicable, the music video, in the capacity of ({{calidad_entidad}}).',
  alcance_2_5: '2.5. It is expressly agreed that the PRODUCER, by themselves or through third parties, may exploit the Recording in the form of a single recording or single; in the form of a music video including or not including the image of the COLLABORATOR; in the form of fragments for use in teasers, trailers, promotional pieces for the Recording, the music video or the professional career of {{productora_nombre_artistico}}, and, in general, broadly as long as the COLLABORATOR\u2019s performance is part of the Recording and is not used independently thereof and is related to the exploitation, advertising, promotion and/or communication of the career and products of {{productora_nombre_artistico}} and/or the PRODUCER.',
  contraprestacion_3_1: '3.1. As consideration for the rights assignment that is the subject of this agreement and as total remuneration for the COLLABORATOR\u2019s participation in the Recording and, where applicable, the music video, the PRODUCER shall pay the COLLABORATOR, by themselves or through third parties, an artist royalty equivalent to {{royalty_texto}} PERCENT ({{royalty_porcentaje}}%) of the income that the PRODUCER obtains from the exploitation of the Recording and, where applicable, the music video, regardless of its source. For these purposes, exploitation of the Recording shall be considered to be any act of commercialization that is remunerated, including, for greater clarity, income from the sale of the Recording in digital format and physical format; income received from streaming of the Recording; income received from streaming of the music video if there is one; income received from exploitation in the form of synchronization of the Recording and, in general, any act of commercialization of the Recording in the Territory and during the Period.',
  contraprestacion_3_2: '3.2. In the event that the Recording is subsequently incorporated into an album or other compilation, and the PRODUCER\u2019s income comes from the exploitation of said album or compilation, said income shall be distributed among the number of recordings included therein to calculate the income corresponding to the Recording and pay the artist royalty accordingly. The method of calculating the royalty, in this case, shall therefore be pro rata tituli (or equal shares for each of the titles).',
  contraprestacion_3_3: '3.3. The PRODUCER shall be responsible for payment of the artist royalty to the COLLABORATOR, although the PRODUCER may entrust said payment to third parties to whom it licenses the commercialization and/or distribution of the Recording, temporarily or permanently.',
  contraprestacion_3_4: '3.4. The frequency of payment of the artist royalty shall be semi-annual, coinciding with the payments that the PRODUCER receives from third parties to whom it licenses the commercialization and/or distribution of the Single and the Recording, and no deductions shall be applied by the PRODUCER.',
  contraprestacion_3_5: '3.5. The PRODUCER shall issue a statement of account in favor of the COLLABORATOR, which could include negative amounts in the event that there are returns, and shall request an invoice from the COLLABORATOR with the detailed frequency. Once the COLLABORATOR has issued said invoice, the PRODUCER shall pay it within thirty (30) days, by bank transfer to the COLLABORATOR\u2019s account that they indicate.',
  notificaciones_4_1: '4.1. The Parties have established as a valid means for sending any communication related to the content of this agreement the sending of emails to the following addresses:',
  confidencialidad_5_1: '5.1. The Parties undertake to maintain in the strictest confidentiality all information, both oral and written, that has been made available to the other party, both prior to the signing of this License and while it is in force. To this end, the Parties undertake not to speak directly or indirectly about confidential information in any public space or space open to the public, nor through third parties without the prior consent of the other party. However, the Parties may share confidential information that is necessary with external advisors, lawyers or accountants, who must have a duty of confidentiality that has at least the scope of this clause. The obligation to maintain confidential information is established without any time limitation.',
  confidencialidad_5_2: '5.2. Likewise, the Parties undertake to comply with current regulations on data protection, mutually obliging themselves not to use the personal data of the other party for purposes different from or incompatible with compliance with the provisions of this License. The data may be retained for the time necessary to comply with possible legal and tax responsibilities. In the event that, due to the territorial scope of this License, the data must be transferred to Third Countries, the PRODUCER undertakes to adopt the security measures that are necessary to prevent, within its possibilities, access to personal data by unauthorized third parties.',
  confidencialidad_5_2b: 'The Parties may exercise their rights of access, opposition, rectification, limitation and portability by sending emails to the address appearing in the Notifications Clause, and must provide a photocopy of their ID to verify the sender\u2019s identity. All of this is without prejudice to the right to file a complaint with the Spanish Data Protection Agency.',
  ley_6_1: '6.1. This License shall be governed and interpreted in accordance with Spanish law and, specifically, by the provisions of the Intellectual Property Law.',
  ley_6_2: '6.2. In the event of any breach, disagreement or conflict that may arise between the Parties, both undertake, firstly, to attempt to resolve it amicably, granting the other party a period of at least ten (10) days from the date on which the aggrieved party sends to the other the reasons on which the breach or conflict is based. Once the amicable route has been exhausted, the Parties, with express waiver of any jurisdiction that may correspond to them, agree to submit to the Barcelona Arbitration Tribunal (TAB).',
};

// =================================================================
// ENGLISH — ALBUM (mentions Album integration explicitly)
// =================================================================
export const IP_CLAUSES_EN_ALBUM: IPLegalClauses = {
  ...IP_CLAUSES_EN_SINGLE,
  alcance_2_5: '2.5. It is expressly agreed that the PRODUCER, by themselves or through third parties, may exploit the Recording independently \u2013 single recording or single \u2013; as an integral part of the Album; in the form of a music video including or not including the image of the COLLABORATOR; in the form of fragments for use in teasers, trailers, promotional pieces for the Album, the Recording, the music video or the professional career of {{productora_nombre_artistico}}, and, in general, broadly as long as the COLLABORATOR\u2019s performance is part of the Recording and is not used independently thereof and is related to the exploitation, advertising, promotion and/or communication of the career and products of {{productora_nombre_artistico}} and/or the PRODUCER.',
  contraprestacion_3_2: '3.2. In the event that the PRODUCER\u2019s income comes from the exploitation of the Album that incorporates the Recording, said income shall be distributed among the number of recordings included therein to calculate the income corresponding to the Recording and pay the artist royalty accordingly. The method of calculating the royalty, in this case, shall therefore be pro rata tituli (or equal shares for each of the titles).',
};

export function getDefaultIPClauses(language: IPLicenseLanguage, recordingType: IPLicenseRecordingType): IPLegalClauses {
  if (language === 'en') return recordingType === 'album' ? IP_CLAUSES_EN_ALBUM : IP_CLAUSES_EN_SINGLE;
  return recordingType === 'album' ? IP_CLAUSES_ES_ALBUM : IP_CLAUSES_ES_SINGLE;
}

// =================================================================
// PDF labels & static text per language
// =================================================================
export interface IPPDFLabels {
  title: string;
  cityPrefix: (day: string, month: string, year: string) => string;
  reunidos: string;
  manifiestan: string;
  clausulas: string;
  deUnaParte: string;
  deOtraParte: string;
  parteIntervencionProductora: (nombre: string, doc: string, dni: string, dom: string) => string;
  parteIntervencionColaboradora: (nombre: string, doc: string, dni: string, dom: string) => string;
  ambasPartes: string;
  capacidadLegal: string;
  manifiestoI: (titulo: string, artistico: string) => string;
  manifiestoIAlbum: (titulo: string, artistico: string) => string;
  manifiestoII: string;
  manifiestoIIAlbum: string;
  manifiestoIII: (artistico: string) => string;
  manifiestoIV: string;
  paraAcordar: string;
  clauseTitles: { objeto: string; alcance: string; contraprestacion: string; notificaciones: string; confidencialidad: string; ley: string };
  subItemsObjeto: { a: string; b: string; c: string; d: string; e: string; f: string };
  alcanceLetters: { a: string; b: string; c: string };
  alcancePeriod: string;
  alcanceTerritory: string;
  alcanceMeans: string;
  acreditacion: { a: string; b: string };
  notificacionesParts: { a: string; b: string };
  signOff: string;
  signProducer: string;
  signCollaborator: string;
}

export const PDF_LABELS_ES: IPPDFLabels = {
  title: 'LICENCIA DE CESIÓN DE DERECHOS DE PROPIEDAD INTELECTUAL',
  cityPrefix: (d, m, y) => `En Barcelona, a ${d} de ${m} de ${y}`,
  reunidos: 'REUNIDOS',
  manifiestan: 'MANIFIESTAN',
  clausulas: 'CLÁUSULAS',
  deUnaParte: 'DE UNA PARTE, ',
  deOtraParte: 'DE OTRA PARTE, ',
  parteIntervencionProductora: (n, t, d, dom) => `${n}, mayor de edad, con ${t} ${d} y domicilio a estos efectos en ${dom}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará la PRODUCTORA.`,
  parteIntervencionColaboradora: (n, t, d, dom) => `${n}, mayor de edad, con ${t} ${d} y domicilio a estos efectos en ${dom}, interviniendo en su propio nombre y representación. En adelante, a esta parte se la denominará el COLABORADOR o la COLABORADORA indistintamente.`,
  ambasPartes: 'En adelante, ambas partes, serán denominadas conjuntamente como las Partes.',
  capacidadLegal: 'Las Partes se reconocen recíprocamente la capacidad legal necesaria para contratar y obligarse y, a tal efecto,',
  manifiestoI: (titulo, artistico) => `Que la PRODUCTORA, es una compositora, intérprete y productora fonográfica que, en su calidad de productora fonográfica, está produciendo un sencillo fonográfico titulado tentativamente "${titulo}" (el Sencillo) que será explotado comercialmente bajo su nombre artístico "${artistico}", por sí o por terceros.`,
  manifiestoIAlbum: (titulo, artistico) => `Que la PRODUCTORA, es una compositora, intérprete y productora fonográfica que, en su calidad de productora fonográfica, está produciendo un álbum o EP titulado tentativamente "${titulo}" (el Álbum) que será explotado comercialmente bajo su nombre artístico "${artistico}", por sí o por terceros.`,
  manifiestoII: 'Que la PRODUCTORA ha solicitado a la COLABORADORA que participe, en calidad de música intérprete y/o ejecutante en una o más obras musicales (la/s Grabación/es), las cuales se detallarán, o para su explotación en forma de sencillo fonográfico, incluyendo o no videoclip y/o materiales audiovisuales promocionales.',
  manifiestoIIAlbum: 'Que la PRODUCTORA ha solicitado a la COLABORADORA que participe, en calidad de música intérprete y/o ejecutante en una o más obras musicales (la/s Grabación/es), las cuales se detallarán, para su inclusión en el Álbum y para su explotación independiente en forma de sencillo fonográfico, incluyendo o no videoclip y/o materiales audiovisuales promocionales.',
  manifiestoIII: (artistico) => `Que la COLABORADORA, conocida artísticamente como "${artistico}", es una intérprete musical independiente, facultada para aceptar la propuesta de colaboración de la PRODUCTORA, en los términos que se dirán, que no está sujeta a contratos de exclusiva que se lo impidan o bien habiendo obtenido las autorizaciones pertinentes de terceros para su aceptación y posterior cesión de derechos de propiedad intelectual sobre sus interpretaciones musicales.`,
  manifiestoIV: 'Que la PRODUCTORA ha llevado a cabo la fijación de las interpretaciones de la COLABORADORA en la/s Grabación/es a satisfacción de las Partes.',
  paraAcordar: 'Con la finalidad de acordar los términos y condiciones de la colaboración entre las Partes y formalizar la cesión de los derechos de propiedad intelectual de la COLABORADORA a favor de la PRODUCTORA, las Partes celebran el presente contrato de Licencia de Derechos de Propiedad Intelectual y acuerdan regirse de conformidad a las siguientes',
  clauseTitles: { objeto: 'OBJETO', alcance: 'ALCANCE DE LA CESIÓN DE DERECHOS', contraprestacion: 'CONTRAPRESTACIÓN', notificaciones: 'NOTIFICACIONES', confidencialidad: 'CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS', ley: 'LEY APLICABLE Y RESOLUCIÓN DE CONFLICTOS' },
  subItemsObjeto: {
    a: 'Título de la obra Grabación:',
    b: 'Calidad en que interviene la COLABORADORA:',
    c: 'Duración de la Grabación:',
    d: 'Participación (Sí/No) en videoclip de la Grabación:',
    e: 'Fecha de la fijación:',
    f: 'Carácter de la intervención:',
  },
  alcanceLetters: { a: 'a. PERIODO:', b: 'b. TERRITORIO:', c: 'c. MEDIOS:' },
  alcancePeriod: 'A perpetuidad.',
  alcanceTerritory: 'El Universo.',
  alcanceMeans: 'Todos los medios existentes durante la vigencia de este contrato.',
  acreditacion: { a: 'Nombre artístico:', b: 'Carácter de la intervención:' },
  notificacionesParts: { a: 'De la PRODUCTORA:', b: 'De la COLABORADORA:' },
  signOff: 'Y en señal de conformidad con lo previsto en este documento y para hacer efectiva la cesión de derechos que contiene esta Licencia, las Partes la firman por duplicado en el lugar y la fecha que consta en el encabezado de este documento.',
  signProducer: 'La PRODUCTORA',
  signCollaborator: 'La COLABORADORA',
};

export const PDF_LABELS_EN: IPPDFLabels = {
  title: 'INTELLECTUAL PROPERTY RIGHTS GRANT LICENSE',
  cityPrefix: (d, m, y) => `In Barcelona, on ${d} of ${m} ${y}`,
  reunidos: 'PARTIES',
  manifiestan: 'RECITALS',
  clausulas: 'TERMS AND CONDITIONS',
  deUnaParte: 'ON THE ONE HAND, ',
  deOtraParte: 'ON THE OTHER HAND, ',
  parteIntervencionProductora: (n, t, d, dom) => `${n}, of legal age, with ID (${t}) ${d} and address for these purposes at ${dom}, acting in their own name and on their own behalf. Hereinafter, this party shall be referred to as the PRODUCER.`,
  parteIntervencionColaboradora: (n, t, d, dom) => `${n}, of legal age, with ID (${t}) ${d} and address for these purposes at ${dom}, acting in their own name and on their own behalf. Hereinafter, this party shall be referred to as the COLLABORATOR.`,
  ambasPartes: 'Hereinafter, both parties shall be jointly referred to as the Parties.',
  capacidadLegal: 'The Parties mutually acknowledge each other\u2019s legal capacity to contract and bind themselves and, to this effect,',
  manifiestoI: (titulo, artistico) => `That the PRODUCER is a composer, performer, and phonographic producer who, in their capacity as a phonographic producer, is producing a single phonographic recording tentatively titled "${titulo}" (the Single) which will be commercially exploited under their artistic name "${artistico}", by themselves or by third parties.`,
  manifiestoIAlbum: (titulo, artistico) => `That the PRODUCER is a composer, performer, and phonographic producer who, in their capacity as a phonographic producer, is producing an album or EP tentatively titled "${titulo}" (the Album) which will be commercially exploited under their artistic name "${artistico}", by themselves or by third parties.`,
  manifiestoII: 'That the PRODUCER has requested the COLLABORATOR to participate, as a musical performer and/or artist, in one or more musical works (the Recording/s), which will be detailed, for their exploitation in the form of a phonographic single, including or not including a music video and/or promotional audiovisual materials.',
  manifiestoIIAlbum: 'That the PRODUCER has requested the COLLABORATOR to participate, as a musical performer and/or artist, in one or more musical works (the Recording/s), which will be detailed, for their inclusion in the Album and for their independent exploitation in the form of a phonographic single, including or not including a music video and/or promotional audiovisual materials.',
  manifiestoIII: (artistico) => `That the COLLABORATOR, artistically known as "${artistico}", is an independent musical performer, authorized to accept the PRODUCER\u2019s collaboration proposal, under the terms stated herein, who is not subject to exclusive contracts that would prevent such acceptance, or having obtained the relevant authorizations from third parties for their acceptance and subsequent assignment of intellectual property rights over their musical performances.`,
  manifiestoIV: 'That the PRODUCER has carried out the fixation of the COLLABORATOR\u2019s performances in the Recording/s to the satisfaction of the Parties.',
  paraAcordar: 'For the purpose of agreeing upon the terms and conditions of the collaboration between the Parties and formalizing the assignment of the COLLABORATOR\u2019s intellectual property rights in favor of the PRODUCER, the Parties enter into this Intellectual Property Rights License Agreement and agree to be governed in accordance with the following',
  clauseTitles: { objeto: 'SUBJECT MATTER', alcance: 'SCOPE OF RIGHTS ASSIGNMENT', contraprestacion: 'CONSIDERATION', notificaciones: 'NOTIFICATIONS', confidencialidad: 'CONFIDENTIALITY AND DATA PROTECTION', ley: 'APPLICABLE LAW AND DISPUTE RESOLUTION' },
  subItemsObjeto: {
    a: 'Title of the Recording work:',
    b: 'Capacity in which the COLLABORATOR participates:',
    c: 'Duration of the Recording:',
    d: 'Participation (Yes/No) in music video of the Recording:',
    e: 'Date of fixation:',
    f: 'Nature of participation:',
  },
  alcanceLetters: { a: 'a. PERIOD:', b: 'b. TERRITORY:', c: 'c. MEANS:' },
  alcancePeriod: 'In perpetuity.',
  alcanceTerritory: 'The Universe.',
  alcanceMeans: 'All existing means during the term of this agreement.',
  acreditacion: { a: 'Artistic name:', b: 'Nature of participation:' },
  notificacionesParts: { a: 'From the PRODUCER:', b: 'From the COLLABORATOR:' },
  signOff: 'And in acknowledgment of compliance with the provisions of this document and to make effective the rights assignment contained in this License, the Parties sign it in duplicate at the place and on the date stated in the header of this document.',
  signProducer: 'The PRODUCER',
  signCollaborator: 'The COLLABORATOR',
};

export function getPDFLabels(language: IPLicenseLanguage): IPPDFLabels {
  return language === 'en' ? PDF_LABELS_EN : PDF_LABELS_ES;
}

export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function numberToEnglishText(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  const units = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  if (n < 20) return units[n];
  const tens = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
  if (n === 100) return 'ONE HUNDRED';
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? tens[t] : `${tens[t]}-${units[u]}`;
}
