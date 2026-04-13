import jsPDF from "jspdf";

export interface IPContractData {
  // Execution date
  executionDay: string;
  executionMonth: string;
  executionYear: string;
  
  // Label data
  labelName: string;
  labelAddress: string;
  labelTaxId: string;
  labelRepresentative: string;
  labelRepresentativeTitle: string;
  
  // Featured Artist data
  artistFullName: string;
  artistIdType: string; // NIE/DNI/PASSPORT
  artistIdNumber: string;
  artistAddress: string;
  artistProfessionalName: string;
  
  // Album data
  albumTitle: string;
  albumArtistName: string;
  
  // Track data
  trackTitle: string;
  trackContribution: string;
  trackDuration: string;
  trackVideoParticipation: boolean;
  trackRecordingDate: string;
  trackCreditDesignation: string;
  
  // Rights scope
  term: string; // "Perpetual" or custom
  territory: string; // "Worldwide" or custom
  media: string; // "All media now known or hereafter developed" or custom
  
  // Compensation
  royaltyPercentage: number;
  paymentFrequency: string;
  
  // Credits
  creditProfessionalName: string;
  creditDesignation: string;
  
  // Contact
  labelEmail: string;
  artistEmail: string;
}

export const DEFAULT_IP_CONTRACT_DATA: IPContractData = {
  executionDay: '',
  executionMonth: '',
  executionYear: new Date().getFullYear().toString(),
  labelName: '',
  labelAddress: '',
  labelTaxId: '',
  labelRepresentative: '',
  labelRepresentativeTitle: 'Managing Director',
  artistFullName: '',
  artistIdType: 'DNI',
  artistIdNumber: '',
  artistAddress: '',
  artistProfessionalName: '',
  albumTitle: '',
  albumArtistName: '',
  trackTitle: '',
  trackContribution: '',
  trackDuration: '',
  trackVideoParticipation: false,
  trackRecordingDate: '',
  trackCreditDesignation: 'featured artist',
  term: 'Perpetual',
  territory: 'Worldwide',
  media: 'All media now known or hereafter developed',
  royaltyPercentage: 20,
  paymentFrequency: 'semi-annually',
  creditProfessionalName: '',
  creditDesignation: 'featured artist',
  labelEmail: '',
  artistEmail: '',
};

function safe(val: string | undefined | null): string {
  return val || '___';
}

export function generateIPContractContent(data: IPContractData): string {
  const d = data;
  return `MASTER RECORDING COLLABORATION AGREEMENT

Executed in Barcelona on ${safe(d.executionDay)} of ${safe(d.executionMonth)} ${safe(d.executionYear)}

PARTIES

PARTY OF THE FIRST PART: ${safe(d.labelName)}, with registered office at ${safe(d.labelAddress)}, Tax ID: ${safe(d.labelTaxId)}, represented by its ${safe(d.labelRepresentativeTitle)} ${safe(d.labelRepresentative)}. Hereinafter referred to as the "LABEL".

PARTY OF THE SECOND PART: ${safe(d.artistFullName)}, of legal age, with ID (${safe(d.artistIdType)}) ${safe(d.artistIdNumber)} and address at ${safe(d.artistAddress)}, acting on their own behalf. Hereinafter referred to as the "FEATURED ARTIST".

Both parties shall be collectively referred to as the "Parties".

The Parties acknowledge each other's legal capacity to enter into this Agreement and accordingly,

RECITALS

I) The LABEL is producing an album tentatively titled "${safe(d.albumTitle)}" (the "Album") to be released under the name ${safe(d.albumArtistName)}, whether by the LABEL directly or through third party licensees.

II) The LABEL has invited the FEATURED ARTIST to perform on one or more master recordings (the "Master(s)"), as detailed below, for inclusion on the Album and potential release as single(s), possibly with accompanying music video(s) and/or promotional audiovisual materials.

III) The FEATURED ARTIST, professionally known as "${safe(d.artistProfessionalName)}", is an independent performer with full authority to accept this collaboration opportunity on the terms set forth herein, free from any exclusive contractual obligations that would prevent such participation, or having secured all necessary third-party permissions.

IV) The LABEL has recorded the FEATURED ARTIST's performances on the Master(s) to the mutual satisfaction of the Parties.

NOW, THEREFORE, to establish the terms of their collaboration and formalize the grant of the FEATURED ARTIST's rights to the LABEL, the Parties agree as follows:

TERMS AND CONDITIONS

1. SUBJECT MATTER

1.1. The FEATURED ARTIST hereby grants to the LABEL, on an exclusive basis with the right to sublicense to third parties, all intellectual property rights in and to their performance fixed in the following Master:

    a. Track title: ${safe(d.trackTitle)}
    b. FEATURED ARTIST's contribution: ${safe(d.trackContribution)}
    c. Track duration: ${safe(d.trackDuration)}
    d. Music video participation (Yes/No): ${d.trackVideoParticipation ? 'Yes' : 'No'}
    e. Recording date: ${safe(d.trackRecordingDate)}
    f. Credit designation: ${safe(d.trackCreditDesignation)}

1.2. The FEATURED ARTIST additionally grants to the LABEL, on an exclusive basis with the right to sublicense to third parties, all rights to their name, likeness, and biographical information for purposes of promotion and identification in connection with the Master, and particularly all rights to their image as captured in any audiovisual recording (such as a music video) related to the Master.

2. SCOPE OF RIGHTS

2.1. The rights granted by the FEATURED ARTIST to the LABEL under this Agreement are comprehensive and unrestricted, enabling the LABEL to exploit the Master, the Album, any music video, and any promotional, advertising or informational materials across all formats and platforms for music and audiovisual content, through all media now known or hereafter developed during the term of this grant, subject only to the limitations expressly stated in this Agreement.

    a. TERM: ${safe(d.term)}
    b. TERRITORY: ${safe(d.territory)}
    c. MEDIA: ${safe(d.media)}

2.2. The FEATURED ARTIST grants to the LABEL all rights of reproduction, distribution, public performance, and adaptation necessary for the unhindered exploitation of the Master and any related audiovisual content. The LABEL may license these rights to third parties, transferring the same rights and obligations that the LABEL assumes under this Agreement.

2.3. The LABEL will credit the FEATURED ARTIST in accordance with industry customs and technical limitations of each distribution platform as follows:

    a. Professional name: ${safe(d.creditProfessionalName)}
    b. Credit designation: ${safe(d.creditDesignation)}

2.4. Notwithstanding the rights granted herein, the FEATURED ARTIST may register their participation with relevant performing rights organizations in connection with the Master and any music video, in their capacity as a performing musician.

2.5. The Parties expressly agree that the LABEL, directly or through third parties, may exploit the Master (i) as a standalone single, (ii) as part of the Album, (iii) in music video form whether or not featuring the FEATURED ARTIST's image, (iv) in excerpts for teasers, trailers, promotional content for the Album, Master, music video or ${safe(d.albumArtistName)}'s career generally, and (v) in any other manner, provided that the FEATURED ARTIST's performance remains part of the Master and is not used separately from it, and relates to the promotion or commercial exploitation of ${safe(d.albumArtistName)}'s career and releases and/or the LABEL's catalog.

3. COMPENSATION

3.1. In consideration for the rights granted under this Agreement and as full compensation for the FEATURED ARTIST's participation in the Master and any music video, the LABEL shall pay the FEATURED ARTIST, directly or through its licensees, a royalty equal to ${d.royaltyPercentage ? d.royaltyPercentage.toString().toUpperCase() : 'TWENTY'} PERCENT (${d.royaltyPercentage || 20}%) of all income received by the LABEL from the exploitation of the Master and any related music video, regardless of source. For clarity, "exploitation" includes any revenue-generating use, including but not limited to sales in digital and physical formats, streaming revenue from the Master, streaming revenue from any music video, synchronization income, and any other commercialization within the Territory throughout the Term.

3.2. If the LABEL's income derives from exploitation of the Album incorporating the Master, such income will be allocated equally among all tracks on the Album to determine the revenue attributable to the Master for purposes of calculating the FEATURED ARTIST's royalty.

3.3. While the LABEL remains responsible for payment of the FEATURED ARTIST's royalty, the LABEL may delegate this obligation to third-party licensees or distributors on a temporary or permanent basis.

3.4. Royalty payments will be made ${safe(d.paymentFrequency)}, in line with the LABEL's receipt of payments from its licensees or distributors for the Album and Master, with no deductions taken by the LABEL.

3.5. The LABEL will provide the FEATURED ARTIST with a royalty statement (which may reflect negative balances in the case of returns) and request an invoice from the FEATURED ARTIST for each accounting period. The LABEL will pay any amount due within thirty (30) days of receiving the FEATURED ARTIST's invoice via bank transfer to an account designated by the FEATURED ARTIST.

4. NOTICES

4.1. The Parties agree that email shall be a valid method of communication for all matters related to this Agreement, using the following addresses:

    a. LABEL: ${safe(d.labelEmail)}
    b. FEATURED ARTIST: ${safe(d.artistEmail)}

5. CONFIDENTIALITY AND DATA PROTECTION

5.1. Both Parties shall maintain strict confidentiality regarding all information, whether oral or written, disclosed by either party before or during the term of this Agreement. Neither party shall discuss confidential information directly or indirectly in any public forum or through third parties without the other party's prior consent. The Parties may share necessary confidential information with external advisors, attorneys, or accountants who are bound by professional confidentiality obligations at least as protective as those contained herein. This confidentiality obligation has no time limit.

5.2. The Parties shall comply with applicable data protection laws and shall not use personal data of the other party for purposes incompatible with the performance of this Agreement. Data may be retained as necessary to fulfill legal and tax obligations. If data must be transferred outside the European Economic Area due to the territorial scope of this Agreement, the LABEL will implement appropriate safeguards to prevent unauthorized access to personal data.

Either Party may exercise their rights of access, objection, correction, restriction, and portability by emailing the address provided in the Notices section, including proof of identity. This provision does not affect either Party's right to file a complaint with the Spanish Data Protection Agency.

6. GOVERNING LAW AND DISPUTE RESOLUTION

6.1. This Agreement shall be governed by and construed in accordance with Spanish law, particularly the Spanish Intellectual Property Law.

6.2. In the event of any breach, disagreement, or dispute arising between the Parties, they will first attempt to resolve the matter amicably, allowing the other party at least ten (10) days from notification of the grounds for complaint to address the issue. If amicable resolution proves impossible, the Parties hereby waive any jurisdictional rights they may have and agree to submit the dispute to the Barcelona Arbitration Court (TAB).

IN WITNESS WHEREOF, the Parties have executed this Agreement in duplicate on the date first written above.


For the LABEL                                    FEATURED ARTIST


_____________________                             _____________________
${safe(d.labelRepresentative)}                    ${safe(d.artistFullName)}`;
}

export function generateIPContractPDF(data: IPContractData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginLeft = 25;
  const marginRight = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = 5;
  let y = 30;

  const addPage = () => {
    doc.addPage();
    y = 25;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 275) {
      addPage();
    }
  };

  const writeTitle = (text: string) => {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const w = doc.getTextWidth(text);
    doc.text(text, (pageWidth - w) / 2, y);
    y += 10;
  };

  const writeSectionTitle = (text: string) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(text, marginLeft, y);
    y += 7;
  };

  const writeSubTitle = (text: string) => {
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(text, marginLeft, y);
    y += 6;
  };

  const writeParagraph = (text: string, indent = 0) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      checkPageBreak(lineHeight + 1);
      doc.text(line, marginLeft + indent, y);
      y += lineHeight;
    }
    y += 2;
  };

  const writeBoldParagraph = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight + 1);
      doc.text(line, marginLeft, y);
      y += lineHeight;
    }
    y += 2;
  };

  const writeItem = (label: string, value: string) => {
    checkPageBreak(lineHeight + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${label} ${value}`, marginLeft + 8, y);
    y += lineHeight;
  };

  // ========== PAGE 1 ==========
  writeTitle('MASTER RECORDING COLLABORATION AGREEMENT');
  
  writeParagraph(`Executed in Barcelona on ${safe(data.executionDay)} of ${safe(data.executionMonth)} ${safe(data.executionYear)}`);
  y += 3;

  writeSectionTitle('PARTIES');

  writeParagraph(`PARTY OF THE FIRST PART: ${safe(data.labelName)}, with registered office at ${safe(data.labelAddress)}, Tax ID: ${safe(data.labelTaxId)}, represented by its ${safe(data.labelRepresentativeTitle)} ${safe(data.labelRepresentative)}. Hereinafter referred to as the "LABEL".`);

  writeParagraph(`PARTY OF THE SECOND PART: ${safe(data.artistFullName)}, of legal age, with ID (${safe(data.artistIdType)}) ${safe(data.artistIdNumber)} and address at ${safe(data.artistAddress)}, acting on their own behalf. Hereinafter referred to as the "FEATURED ARTIST".`);

  writeParagraph('Both parties shall be collectively referred to as the "Parties".');
  writeParagraph('The Parties acknowledge each other\'s legal capacity to enter into this Agreement and accordingly,');

  writeSectionTitle('RECITALS');

  writeParagraph(`I) The LABEL is producing an album tentatively titled "${safe(data.albumTitle)}" (the "Album") to be released under the name ${safe(data.albumArtistName)}, whether by the LABEL directly or through third party licensees.`);

  writeParagraph(`II) The LABEL has invited the FEATURED ARTIST to perform on one or more master recordings (the "Master(s)"), as detailed below, for inclusion on the Album and potential release as single(s), possibly with accompanying music video(s) and/or promotional audiovisual materials.`);

  writeParagraph(`III) The FEATURED ARTIST, professionally known as "${safe(data.artistProfessionalName)}", is an independent performer with full authority to accept this collaboration opportunity on the terms set forth herein, free from any exclusive contractual obligations that would prevent such participation, or having secured all necessary third-party permissions.`);

  writeParagraph(`IV) The LABEL has recorded the FEATURED ARTIST's performances on the Master(s) to the mutual satisfaction of the Parties.`);

  writeParagraph('NOW, THEREFORE, to establish the terms of their collaboration and formalize the grant of the FEATURED ARTIST\'s rights to the LABEL, the Parties agree as follows:');

  writeBoldParagraph('TERMS AND CONDITIONS');

  writeBoldParagraph('1. SUBJECT MATTER');

  writeParagraph('1.1. The FEATURED ARTIST hereby grants to the LABEL, on an exclusive basis with the right to sublicense to third parties, all intellectual property rights in and to their performance fixed in the following Master:');

  writeItem('a. Track title:', safe(data.trackTitle));
  writeItem('b. FEATURED ARTIST\'s contribution:', safe(data.trackContribution));
  writeItem('c. Track duration:', safe(data.trackDuration));
  writeItem('d. Music video participation (Yes/No):', data.trackVideoParticipation ? 'Yes' : 'No');
  writeItem('e. Recording date:', safe(data.trackRecordingDate));
  writeItem('f. Credit designation:', safe(data.trackCreditDesignation));
  y += 2;

  writeParagraph('1.2. The FEATURED ARTIST additionally grants to the LABEL, on an exclusive basis with the right to sublicense to third parties, all rights to their name, likeness, and biographical information for purposes of promotion and identification in connection with the Master, and particularly all rights to their image as captured in any audiovisual recording (such as a music video) related to the Master.');

  writeBoldParagraph('2. SCOPE OF RIGHTS');

  writeParagraph('2.1. The rights granted by the FEATURED ARTIST to the LABEL under this Agreement are comprehensive and unrestricted, enabling the LABEL to exploit the Master, the Album, any music video, and any promotional, advertising or informational materials across all formats and platforms for music and audiovisual content, through all media now known or hereafter developed during the term of this grant, subject only to the limitations expressly stated in this Agreement.');

  writeItem('a. TERM:', safe(data.term));
  writeItem('b. TERRITORY:', safe(data.territory));
  writeItem('c. MEDIA:', safe(data.media));
  y += 2;

  writeParagraph('2.2. The FEATURED ARTIST grants to the LABEL all rights of reproduction, distribution, public performance, and adaptation necessary for the unhindered exploitation of the Master and any related audiovisual content. The LABEL may license these rights to third parties, transferring the same rights and obligations that the LABEL assumes under this Agreement.');

  writeParagraph('2.3. The LABEL will credit the FEATURED ARTIST in accordance with industry customs and technical limitations of each distribution platform as follows:');

  writeItem('a. Professional name:', safe(data.creditProfessionalName));
  writeItem('b. Credit designation:', safe(data.creditDesignation));
  y += 2;

  writeParagraph('2.4. Notwithstanding the rights granted herein, the FEATURED ARTIST may register their participation with relevant performing rights organizations in connection with the Master and any music video, in their capacity as a performing musician.');

  writeParagraph(`2.5. The Parties expressly agree that the LABEL, directly or through third parties, may exploit the Master (i) as a standalone single, (ii) as part of the Album, (iii) in music video form whether or not featuring the FEATURED ARTIST's image, (iv) in excerpts for teasers, trailers, promotional content for the Album, Master, music video or ${safe(data.albumArtistName)}'s career generally, and (v) in any other manner, provided that the FEATURED ARTIST's performance remains part of the Master and is not used separately from it, and relates to the promotion or commercial exploitation of ${safe(data.albumArtistName)}'s career and releases and/or the LABEL's catalog.`);

  writeBoldParagraph('3. COMPENSATION');

  const royaltyWord = numberToWord(data.royaltyPercentage || 20);
  writeParagraph(`3.1. In consideration for the rights granted under this Agreement and as full compensation for the FEATURED ARTIST's participation in the Master and any music video, the LABEL shall pay the FEATURED ARTIST, directly or through its licensees, a royalty equal to ${royaltyWord} PERCENT (${data.royaltyPercentage || 20}%) of all income received by the LABEL from the exploitation of the Master and any related music video, regardless of source. For clarity, "exploitation" includes any revenue-generating use, including but not limited to sales in digital and physical formats, streaming revenue from the Master, streaming revenue from any music video, synchronization income, and any other commercialization within the Territory throughout the Term.`);

  writeParagraph('3.2. If the LABEL\'s income derives from exploitation of the Album incorporating the Master, such income will be allocated equally among all tracks on the Album to determine the revenue attributable to the Master for purposes of calculating the FEATURED ARTIST\'s royalty.');

  writeParagraph('3.3. While the LABEL remains responsible for payment of the FEATURED ARTIST\'s royalty, the LABEL may delegate this obligation to third-party licensees or distributors on a temporary or permanent basis.');

  writeParagraph(`3.4. Royalty payments will be made ${safe(data.paymentFrequency)}, in line with the LABEL's receipt of payments from its licensees or distributors for the Album and Master, with no deductions taken by the LABEL.`);

  writeParagraph('3.5. The LABEL will provide the FEATURED ARTIST with a royalty statement (which may reflect negative balances in the case of returns) and request an invoice from the FEATURED ARTIST for each accounting period. The LABEL will pay any amount due within thirty (30) days of receiving the FEATURED ARTIST\'s invoice via bank transfer to an account designated by the FEATURED ARTIST.');

  writeBoldParagraph('4. NOTICES');

  writeParagraph('4.1. The Parties agree that email shall be a valid method of communication for all matters related to this Agreement, using the following addresses:');

  writeItem('a. LABEL:', safe(data.labelEmail));
  writeItem('b. FEATURED ARTIST:', safe(data.artistEmail));
  y += 2;

  writeBoldParagraph('5. CONFIDENTIALITY AND DATA PROTECTION');

  writeParagraph('5.1. Both Parties shall maintain strict confidentiality regarding all information, whether oral or written, disclosed by either party before or during the term of this Agreement. Neither party shall discuss confidential information directly or indirectly in any public forum or through third parties without the other party\'s prior consent. The Parties may share necessary confidential information with external advisors, attorneys, or accountants who are bound by professional confidentiality obligations at least as protective as those contained herein. This confidentiality obligation has no time limit.');

  writeParagraph('5.2. The Parties shall comply with applicable data protection laws and shall not use personal data of the other party for purposes incompatible with the performance of this Agreement. Data may be retained as necessary to fulfill legal and tax obligations. If data must be transferred outside the European Economic Area due to the territorial scope of this Agreement, the LABEL will implement appropriate safeguards to prevent unauthorized access to personal data.');

  writeParagraph('Either Party may exercise their rights of access, objection, correction, restriction, and portability by emailing the address provided in the Notices section, including proof of identity. This provision does not affect either Party\'s right to file a complaint with the Spanish Data Protection Agency.');

  writeBoldParagraph('6. GOVERNING LAW AND DISPUTE RESOLUTION');

  writeParagraph('6.1. This Agreement shall be governed by and construed in accordance with Spanish law, particularly the Spanish Intellectual Property Law.');

  writeParagraph('6.2. In the event of any breach, disagreement, or dispute arising between the Parties, they will first attempt to resolve the matter amicably, allowing the other party at least ten (10) days from notification of the grounds for complaint to address the issue. If amicable resolution proves impossible, the Parties hereby waive any jurisdictional rights they may have and agree to submit the dispute to the Barcelona Arbitration Court (TAB).');

  y += 5;
  writeParagraph('IN WITNESS WHEREOF, the Parties have executed this Agreement in duplicate on the date first written above.');
  y += 10;

  checkPageBreak(30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('For the LABEL', marginLeft, y);
  doc.text('FEATURED ARTIST', marginLeft + 100, y);
  y += 20;
  doc.text('_____________________', marginLeft, y);
  doc.text('_____________________', marginLeft + 100, y);
  y += 6;
  doc.text(safe(data.labelRepresentative), marginLeft, y);
  doc.text(safe(data.artistFullName), marginLeft + 100, y);

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
  }

  return doc;
}

function numberToWord(n: number): string {
  const words: Record<number, string> = {
    5: 'FIVE', 10: 'TEN', 15: 'FIFTEEN', 20: 'TWENTY', 25: 'TWENTY-FIVE',
    30: 'THIRTY', 35: 'THIRTY-FIVE', 40: 'FORTY', 45: 'FORTY-FIVE', 50: 'FIFTY',
  };
  return words[n] || n.toString();
}
