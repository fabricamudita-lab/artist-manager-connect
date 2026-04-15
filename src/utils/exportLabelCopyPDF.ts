import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CREDIT_CATEGORIES,
  getRoleLabel,
  getRoleCategory5,
  type CreditCategory,
} from '@/lib/creditRoles';

interface LabelCopyRelease {
  title: string;
  type: 'album' | 'ep' | 'single';
  release_date: string | null;
  label: string | null;
  upc: string | null;
  copyright: string | null;
  genre: string | null;
  secondary_genre: string | null;
  language: string | null;
  production_year: number | null;
  artist?: { name: string } | null;
  release_artists?: { role: string; artist?: { name: string } | null }[];
}

interface LabelCopyTrack {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
  lyrics: string | null;
  explicit: boolean | null;
  c_copyright_holder: string | null;
  c_copyright_year: number | null;
  p_copyright_holder: string | null;
  p_production_year: number | null;
}

interface LabelCopyCredit {
  track_id: string;
  name: string;
  role: string;
  publishing_percentage: number | null;
  master_percentage: number | null;
}

interface LabelCopyTrackArtist {
  track_id: string;
  role: string;
  artist_name: string;
}

const PAGE_WIDTH = 210;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 5;
const PAGE_BOTTOM = 280;

function addPageIfNeeded(doc: jsPDF, y: number, needed: number = 20): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSeparator(doc: jsPDF, y: number): number {
  y = addPageIfNeeded(doc, y, 10);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  return y + 6;
}

function buildArtistDisplay(
  trackArtists: LabelCopyTrackArtist[],
  trackId: string,
  fallbackRelease: LabelCopyRelease,
): string {
  const ta = trackArtists.filter(a => a.track_id === trackId);
  if (ta.length > 0) {
    const mainNames = ta.filter(a => a.role !== 'featuring').map(a => a.artist_name).filter(Boolean);
    const featNames = ta.filter(a => a.role === 'featuring').map(a => a.artist_name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  if (fallbackRelease.release_artists && fallbackRelease.release_artists.length > 0) {
    const mainNames = fallbackRelease.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = fallbackRelease.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  return fallbackRelease.artist?.name || '—';
}

/** Group credits by person name, collecting all roles */
function groupCreditsByPerson(credits: LabelCopyCredit[]): { name: string; roles: string[] }[] {
  const map = new Map<string, { name: string; roles: string[] }>();
  for (const c of credits) {
    const key = c.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { name: c.name, roles: [] });
    }
    const roleLabel = getRoleLabel(c.role);
    if (!map.get(key)!.roles.includes(roleLabel)) {
      map.get(key)!.roles.push(roleLabel);
    }
  }
  return Array.from(map.values());
}

export function exportLabelCopyPDF(
  release: LabelCopyRelease,
  tracks: LabelCopyTrack[],
  credits: LabelCopyCredit[],
  trackArtists: LabelCopyTrackArtist[] = [],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LABEL COPY', MARGIN_LEFT, y);
  y += 10;

  y = drawSeparator(doc, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const typeLabel = release.type === 'single' ? 'Single' : release.type === 'ep' ? 'EP' : 'Álbum';

  let artistDisplay = release.artist?.name || '—';
  if (release.release_artists && release.release_artists.length > 0) {
    const mainNames = release.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = release.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    artistDisplay = mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }

  const headerFields: [string, string][] = [
    ['Título', release.title],
    ['Artista', artistDisplay],
    ['Tipo', typeLabel],
  ];
  if (release.label) headerFields.push(['Sello', release.label]);
  if (release.upc) headerFields.push(['UPC', release.upc]);
  if (release.copyright) headerFields.push(['Copyright', release.copyright]);
  if (release.genre) headerFields.push(['Género', release.genre]);
  if (release.secondary_genre) headerFields.push(['Género Secundario', release.secondary_genre]);
  if (release.language) headerFields.push(['Idioma', release.language]);
  if (release.production_year) headerFields.push(['Año de Producción', String(release.production_year)]);
  if (release.release_date) {
    headerFields.push([
      'Fecha de lanzamiento',
      format(new Date(release.release_date), "d 'de' MMMM yyyy", { locale: es }),
    ]);
  }

  for (const [label, value] of headerFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}: `, MARGIN_LEFT, y);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN_LEFT + labelWidth, y);
    y += LINE_HEIGHT + 1;
  }

  y += 2;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Exportado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, MARGIN_LEFT, y);
  doc.setTextColor(0);
  y += 8;

  // ── Tracks ──
  const sortedTracks = [...tracks].sort((a, b) => a.track_number - b.track_number);

  for (const track of sortedTracks) {
    y = drawSeparator(doc, y);
    y = addPageIfNeeded(doc, y, 30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${track.track_number}. ${track.title}`, MARGIN_LEFT, y);
    y += 7;

    const trackArtistDisplay = buildArtistDisplay(trackArtists, track.id, release);
    if (trackArtistDisplay && trackArtistDisplay !== artistDisplay) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Artista: ${trackArtistDisplay}`, MARGIN_LEFT + 5, y);
      y += 6;
    }

    if (track.isrc) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`ISRC: ${track.isrc}`, MARGIN_LEFT + 5, y);
      y += 6;
    }

    if (track.explicit) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Contenido explicito', MARGIN_LEFT + 5, y);
      y += 6;
    }

    const copyrightLines: string[] = [];
    if (track.c_copyright_holder) {
      copyrightLines.push(`© ${track.c_copyright_year || ''} ${track.c_copyright_holder}`.trim());
    }
    if (track.p_copyright_holder) {
      copyrightLines.push(`℗ ${track.p_production_year || ''} ${track.p_copyright_holder}`.trim());
    }
    if (copyrightLines.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const line of copyrightLines) {
        y = addPageIfNeeded(doc, y, 6);
        doc.text(line, MARGIN_LEFT + 5, y);
        y += 5;
      }
      y += 1;
    }

    // Credits grouped by person (NO percentages)
    const trackCredits = credits.filter((c) => c.track_id === track.id);

    if (trackCredits.length > 0) {
      y = addPageIfNeeded(doc, y, 15);
      y += 2;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CRÉDITOS:', MARGIN_LEFT + 5, y);
      y += 6;

      const grouped = groupCreditsByPerson(trackCredits);
      for (const person of grouped) {
        y = addPageIfNeeded(doc, y, 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(person.name, MARGIN_LEFT + 8, y);
        const nameW = doc.getTextWidth(person.name);
        doc.setFont('helvetica', 'normal');
        doc.text(` — ${person.roles.join(', ')}`, MARGIN_LEFT + 8 + nameW, y);
        y += LINE_HEIGHT + 0.5;
      }
      y += 3;
    }

    // Lyrics
    if (track.lyrics) {
      y = addPageIfNeeded(doc, y, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LETRA:', MARGIN_LEFT + 5, y);
      y += 6;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);

      const lines = track.lyrics.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          y += 3;
          continue;
        }
        const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 10);
        for (const wl of wrapped) {
          y = addPageIfNeeded(doc, y, 6);
          doc.text(wl, MARGIN_LEFT + 8, y);
          y += LINE_HEIGHT;
        }
      }
      doc.setTextColor(0);
      y += 4;
    }

    y += 4;
  }

  const safeName = release.title
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  doc.save(`label_copy_${safeName}.pdf`);
}
