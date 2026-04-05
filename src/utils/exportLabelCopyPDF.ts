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

const PAGE_WIDTH = 210; // A4 mm
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
  // Fallback to release-level artists
  if (fallbackRelease.release_artists && fallbackRelease.release_artists.length > 0) {
    const mainNames = fallbackRelease.release_artists.filter(ra => ra.role !== 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    const featNames = fallbackRelease.release_artists.filter(ra => ra.role === 'featuring').map(ra => ra.artist?.name).filter(Boolean);
    return mainNames.join(', ') + (featNames.length > 0 ? ' feat. ' + featNames.join(', ') : '');
  }
  return fallbackRelease.artist?.name || '—';
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

  // Build artist display from release level
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

  // Export date
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

    // Track title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${track.track_number}. ${track.title}`, MARGIN_LEFT, y);
    y += 7;

    // Track artist (per-track)
    const trackArtistDisplay = buildArtistDisplay(trackArtists, track.id, release);
    if (trackArtistDisplay && trackArtistDisplay !== artistDisplay) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Artista: ${trackArtistDisplay}`, MARGIN_LEFT + 5, y);
      y += 6;
    }

    // ISRC
    if (track.isrc) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`ISRC: ${track.isrc}`, MARGIN_LEFT + 5, y);
      y += 6;
    }

    // Explicit flag
    if (track.explicit) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('🅴 Contiene letras explícitas', MARGIN_LEFT + 5, y);
      y += 6;
    }

    // Copyright info
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
    const trackCredits = credits.filter((c) => c.track_id === track.id);

    if (trackCredits.length > 0) {
      y = addPageIfNeeded(doc, y, 15);
      y += 2;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CRÉDITOS:', MARGIN_LEFT + 5, y);
      y += 6;

      // Group by category
      const grouped = new Map<CreditCategory, LabelCopyCredit[]>();
      for (const credit of trackCredits) {
        const cat = getRoleCategory5(credit.role) || 'contribuidor';
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(credit);
      }

      // Render in category order
      for (const catMeta of CREDIT_CATEGORIES) {
        const catCredits = grouped.get(catMeta.id);
        if (!catCredits || catCredits.length === 0) continue;

        for (const credit of catCredits) {
          y = addPageIfNeeded(doc, y, 8);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const roleText = `${getRoleLabel(credit.role)}: `;
          doc.text(roleText, MARGIN_LEFT + 8, y);
          const roleW = doc.getTextWidth(roleText);

          doc.setFont('helvetica', 'normal');
          let nameText = credit.name;

          // Add percentages
          const pcts: string[] = [];
          if (credit.publishing_percentage != null && credit.publishing_percentage > 0) {
            pcts.push(`${credit.publishing_percentage}% Autoría`);
          }
          if (credit.master_percentage != null && credit.master_percentage > 0) {
            pcts.push(`${credit.master_percentage}% Master`);
          }
          if (pcts.length > 0) {
            nameText += ` (${pcts.join(', ')})`;
          }

          doc.text(nameText, MARGIN_LEFT + 8 + roleW, y);
          y += LINE_HEIGHT + 0.5;
        }
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
        // Wrap long lines
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

  // Save
  const safeName = release.title
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  doc.save(`label_copy_${safeName}.pdf`);
}
