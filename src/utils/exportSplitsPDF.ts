import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleLabel } from '@/lib/creditRoles';

interface SplitsRelease {
  title: string;
  type: 'album' | 'ep' | 'single';
  release_date: string | null;
  label: string | null;
  upc: string | null;
  artist?: { name: string } | null;
  release_artists?: { role: string; artist?: { name: string } | null }[];
}

interface SplitsTrack {
  id: string;
  title: string;
  track_number: number;
  isrc: string | null;
}

interface SplitsCredit {
  track_id: string;
  name: string;
  role: string;
  publishing_percentage: number | null;
  master_percentage: number | null;
}

const PAGE_WIDTH = 210;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
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

interface GroupedSplit {
  name: string;
  roles: string[];
  percentage: number;
}

function groupByPerson(credits: SplitsCredit[], type: 'publishing' | 'master'): GroupedSplit[] {
  const map = new Map<string, GroupedSplit>();
  for (const c of credits) {
    const pct = type === 'publishing' ? c.publishing_percentage : c.master_percentage;
    if (pct == null || pct <= 0) continue;
    const key = c.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { name: c.name, roles: [], percentage: 0 });
    }
    const entry = map.get(key)!;
    const roleLabel = getRoleLabel(c.role);
    if (!entry.roles.includes(roleLabel)) {
      entry.roles.push(roleLabel);
    }
    entry.percentage += pct;
  }
  return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
}

function drawSplitTable(
  doc: jsPDF,
  y: number,
  title: string,
  rows: GroupedSplit[],
): number {
  if (rows.length === 0) return y;

  y = addPageIfNeeded(doc, y, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN_LEFT + 5, y);
  y += 6;

  // Table header
  const colName = MARGIN_LEFT + 8;
  const colRoles = MARGIN_LEFT + 70;
  const colPct = PAGE_WIDTH - MARGIN_RIGHT - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('Nombre', colName, y);
  doc.text('Roles', colRoles, y);
  doc.text('%', colPct, y, { align: 'right' });
  y += 1;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 4;
  doc.setTextColor(0);

  // Rows
  let total = 0;
  for (const row of rows) {
    y = addPageIfNeeded(doc, y, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(row.name, colName, y);
    doc.text(row.roles.join(', '), colRoles, y);
    doc.text(`${row.percentage}%`, colPct, y, { align: 'right' });
    total += row.percentage;
    y += LINE_HEIGHT + 0.5;
  }

  // Total
  y += 1;
  doc.setDrawColor(200);
  doc.line(colName, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', colName, y);
  doc.text(`${Math.round(total * 100) / 100}%`, colPct, y, { align: 'right' });
  y += 7;

  return y;
}

export function exportSplitsPDF(
  release: SplitsRelease,
  tracks: SplitsTrack[],
  credits: SplitsCredit[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SPLITS DE DERECHOS', MARGIN_LEFT, y);
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
    y += 3;

    if (track.isrc) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`ISRC: ${track.isrc}`, MARGIN_LEFT + 5, y + 4);
      doc.setTextColor(0);
      y += 7;
    } else {
      y += 4;
    }

    const trackCredits = credits.filter(c => c.track_id === track.id);

    const publishingRows = groupByPerson(trackCredits, 'publishing');
    const masterRows = groupByPerson(trackCredits, 'master');

    if (publishingRows.length === 0 && masterRows.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150);
      doc.text('Sin splits asignados', MARGIN_LEFT + 5, y);
      doc.setTextColor(0);
      y += 8;
      continue;
    }

    y = drawSplitTable(doc, y, 'AUTORÍA / PUBLISHING', publishingRows);
    y = drawSplitTable(doc, y, 'MASTER / ROYALTIES', masterRows);

    y += 4;
  }

  const safeName = release.title
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  doc.save(`splits_derechos_${safeName}.pdf`);
}
