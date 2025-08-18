import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Import text extraction libraries
import { getDocument } from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';
import { extractRawText } from 'https://esm.sh/mammoth@1.6.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced text extraction functions
const extractTextFromPDF = async (file: Blob): Promise<{ text: string; pageIndex: number }[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: { text: string; pageIndex: number }[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .filter((item: any) => item.str)
        .map((item: any) => item.str)
        .join(' ');
      
      if (text.trim()) {
        pages.push({ text: text.trim(), pageIndex: i });
      }
    }
    
    return pages;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return [{ text: `PDF extraction failed: ${error.message}`, pageIndex: 1 }];
  }
};

const extractTextFromDOCX = async (file: Blob): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return `DOCX extraction failed: ${error.message}`;
  }
};

const extractTextFromExcel = async (file: Blob): Promise<{ text: string; sheetName: string }[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheets: { text: string; sheetName: string }[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      
      if (csvContent.trim()) {
        sheets.push({
          text: `Sheet: ${sheetName}\n${csvContent}`,
          sheetName
        });
      }
    });
    
    return sheets;
  } catch (error) {
    console.error('Excel extraction error:', error);
    return [{ text: `Excel extraction failed: ${error.message}`, sheetName: 'error' }];
  }
};

const isImageFile = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'tiff'].includes(extension || '');
};

const extractTextFromFile = async (file: Blob, fileName: string): Promise<{
  fragments: Array<{
    text: string;
    pageIndex?: number;
    sheetName?: string;
    metadata: any;
  }>;
  fileType: string;
  supported: boolean;
  skipReason?: string;
}> => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  try {
    switch (extension) {
      case 'pdf':
        const pdfPages = await extractTextFromPDF(file);
        return {
          fragments: pdfPages.map(page => ({
            text: page.text,
            pageIndex: page.pageIndex,
            metadata: { pageIndex: page.pageIndex }
          })),
          fileType: 'PDF',
          supported: true
        };
      
      case 'doc':
      case 'docx':
        const docText = await extractTextFromDOCX(file);
        return {
          fragments: [{ text: docText, metadata: {} }],
          fileType: 'DOC',
          supported: true
        };
      
      case 'xls':
      case 'xlsx':
        const excelSheets = await extractTextFromExcel(file);
        return {
          fragments: excelSheets.map(sheet => ({
            text: sheet.text,
            sheetName: sheet.sheetName,
            metadata: { sheetName: sheet.sheetName }
          })),
          fileType: 'XLS',
          supported: true
        };
      
      case 'txt':
      case 'md':
        const textContent = await file.text();
        return {
          fragments: [{ text: textContent, metadata: {} }],
          fileType: 'TXT',
          supported: true
        };
      
      case 'csv':
        const csvContent = await file.text();
        const csvLines = csvContent.split('\n').filter(line => line.trim());
        return {
          fragments: [{ text: csvLines.join('\n'), metadata: { rows: csvLines.length } }],
          fileType: 'CSV',
          supported: true
        };
      
      case 'json':
        const jsonContent = await file.text();
        const jsonData = JSON.parse(jsonContent);
        return {
          fragments: [{ text: JSON.stringify(jsonData, null, 2), metadata: {} }],
          fileType: 'JSON',
          supported: true
        };
      
      default:
        if (isImageFile(fileName)) {
          // For images, store metadata only (OCR could be added here)
          return {
            fragments: [{
              text: `Image file: ${fileName} (OCR not available)`,
              metadata: { 
                isImage: true,
                size: file.size,
                type: file.type || 'unknown'
              }
            }],
            fileType: 'IMAGE',
            supported: false,
            skipReason: 'OCR not available'
          };
        } else {
          // Unsupported file type
          return {
            fragments: [{
              text: `File: ${fileName} (${extension} format not supported)`,
              metadata: { 
                size: file.size,
                type: file.type || 'unknown'
              }
            }],
            fileType: 'OTHER',
            supported: false,
            skipReason: `${extension?.toUpperCase()} format not supported`
          };
        }
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    return {
      fragments: [{
        text: `File: ${fileName} (extraction failed: ${error.message})`,
        metadata: { error: error.message }
      }],
      fileType: 'ERROR',
      supported: false,
      skipReason: `Extraction failed: ${error.message}`
    };
  }
};

// Enhanced text chunking with overlap
const chunkTextWithOverlap = (text: string, maxChunkSize = 1800, overlapSize = 250): string[] => {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // If we're not at the end, try to find a sentence boundary
    if (end < text.length) {
      const lastSentenceEnd = text.lastIndexOf('.', end);
      const lastParagraphEnd = text.lastIndexOf('\n', end);
      const boundary = Math.max(lastSentenceEnd, lastParagraphEnd);
      
      if (boundary > start + maxChunkSize * 0.7) {
        end = boundary + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move start position with overlap
    start = Math.max(start + maxChunkSize - overlapSize, end);
  }
  
  return chunks.length > 0 ? chunks : [text];
};

// Generate simple embeddings (placeholder - in production would use actual embeddings)
const generateEmbedding = async (text: string): Promise<number[]> => {
  // This is a placeholder - in production you would use actual embedding models
  // For now, we'll create a simple hash-based representation
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    embedding[index % 384] += Math.abs(hash) / 1000000;
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId } = await req.json();
    
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    console.log(`Starting reindex for event: ${eventId}`);

    // Initialize processing stats
    const stats = {
      PDF: { processed: 0, skipped: 0, errors: 0 },
      DOC: { processed: 0, skipped: 0, errors: 0 },
      XLS: { processed: 0, skipped: 0, errors: 0 },
      TXT: { processed: 0, skipped: 0, errors: 0 },
      CSV: { processed: 0, skipped: 0, errors: 0 },
      JSON: { processed: 0, skipped: 0, errors: 0 },
      IMAGE: { processed: 0, skipped: 0, errors: 0 },
      OTHER: { processed: 0, skipped: 0, errors: 0 }
    };

    // Initialize or update status
    await supabase
      .from('event_index_status')
      .upsert({
        event_id: eventId,
        status: 'processing',
        total_documents: 0,
        processed_documents: 0,
        error_message: null
      });

    // Get booking offer metadata
    const { data: bookingOffer, error: bookingError } = await supabase
      .from('booking_offers')
      .select('*')
      .eq('id', eventId)
      .single();

    if (bookingError) {
      throw new Error(`Failed to fetch booking offer: ${bookingError.message}`);
    }

    // Clear existing index for this event
    await supabase
      .from('event_document_index')
      .delete()
      .eq('event_id', eventId);

    // Index booking metadata
    const bookingMetadata = {
      fecha: bookingOffer.fecha,
      ciudad: bookingOffer.ciudad,
      lugar: bookingOffer.lugar,
      formato: bookingOffer.formato,
      estado: bookingOffer.estado,
      contacto: bookingOffer.contacto,
      tour_manager: bookingOffer.tour_manager,
      oferta: bookingOffer.oferta,
      capacidad: bookingOffer.capacidad,
      festival_ciclo: bookingOffer.festival_ciclo
    };

    const metadataText = Object.entries(bookingMetadata)
      .filter(([_, value]) => value != null)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Add booking metadata to index
    const metadataEmbedding = await generateEmbedding(metadataText);
    await supabase
      .from('event_document_index')
      .insert({
        event_id: eventId,
        file_name: 'booking_metadata',
        file_path: 'metadata',
        subfolder: 'metadata',
        content_fragment: metadataText,
        fragment_index: 0,
        metadata: bookingMetadata,
        embedding_data: metadataEmbedding
      });

    // Scan subfolders for files
    const subfolders = ['Contrato', 'Facturas', 'Assets'];
    const folderName = `${bookingOffer.fecha}_${bookingOffer.ciudad}_${bookingOffer.festival_ciclo}`
      .replace(/[\[\]<>:"|?*]/g, '-')
      .replace(/\s+/g, '_');

    let totalFiles = 0;
    let processedFiles = 0;

    for (const subfolder of subfolders) {
      try {
        // List files in subfolder
        const { data: files, error: listError } = await supabase.storage
          .from('documents')
          .list(`events/${folderName}/${subfolder}`, {
            limit: 1000
          });

        if (listError) {
          console.error(`Error listing files in ${subfolder}:`, listError);
          continue;
        }

        const validFiles = (files || []).filter(file => file.name !== '.keep');
        totalFiles += validFiles.length;

        for (const file of validFiles) {
          try {
            const filePath = `events/${folderName}/${subfolder}/${file.name}`;
            
            // Download file
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('documents')
              .download(filePath);

            if (downloadError) {
              console.error(`Error downloading ${filePath}:`, downloadError);
              continue;
            }

            // Extract text with enhanced extraction
            const extractionResult = await extractTextFromFile(fileData, file.name);
            
            // Update stats
            if (extractionResult.supported) {
              stats[extractionResult.fileType as keyof typeof stats].processed++;
            } else {
              stats[extractionResult.fileType as keyof typeof stats].skipped++;
            }
            
            // Process each fragment
            for (let fragmentIndex = 0; fragmentIndex < extractionResult.fragments.length; fragmentIndex++) {
              const fragment = extractionResult.fragments[fragmentIndex];
              
              // Chunk the text with overlap
              const textChunks = chunkTextWithOverlap(fragment.text);
              
              for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex++) {
                const chunk = textChunks[chunkIndex];
                const embedding = await generateEmbedding(chunk);
                
                await supabase
                  .from('event_document_index')
                  .insert({
                    event_id: eventId,
                    file_name: file.name,
                    file_path: filePath,
                    subfolder: subfolder,
                    content_fragment: chunk,
                    fragment_index: chunkIndex,
                    page_number: fragment.pageIndex || null,
                    metadata: {
                      ...fragment.metadata,
                      file_size: file.metadata?.size || 0,
                      last_modified: file.metadata?.lastModified || file.updated_at,
                      content_type: file.metadata?.mimetype || 'unknown',
                      file_type: extractionResult.fileType,
                      supported: extractionResult.supported,
                      skip_reason: extractionResult.skipReason,
                      sheet_name: fragment.sheetName,
                      chunk_index: chunkIndex,
                      total_chunks: textChunks.length,
                      fragment_index: fragmentIndex,
                      total_fragments: extractionResult.fragments.length
                    },
                    embedding_data: embedding
                  });
              }
            }

            processedFiles++;
            
            // Update progress
            await supabase
              .from('event_index_status')
              .update({
                processed_documents: processedFiles,
                total_documents: totalFiles
              })
              .eq('event_id', eventId);

          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            // Update error stats
            stats.OTHER.errors++;
          }
        }
      } catch (folderError) {
        console.error(`Error processing folder ${subfolder}:`, folderError);
      }
    }

    // Generate detailed processing summary
    const processingSummary = Object.entries(stats)
      .map(([type, stat]) => ({
        type,
        processed: stat.processed,
        skipped: stat.skipped,
        errors: stat.errors,
        total: stat.processed + stat.skipped + stat.errors
      }))
      .filter(summary => summary.total > 0);

    // Update final status with detailed metrics
    await supabase
      .from('event_index_status')
      .update({
        status: 'completed',
        total_documents: totalFiles,
        processed_documents: processedFiles,
        last_indexed_at: new Date().toISOString(),
        error_message: null,
        metadata: {
          processing_stats: stats,
          processing_summary: processingSummary
        }
      })
      .eq('event_id', eventId);

    console.log(`Reindex completed for event ${eventId}:`, {
      totalFiles,
      processedFiles,
      stats,
      processingSummary
    });

    return new Response(JSON.stringify({
      success: true,
      totalDocuments: totalFiles,
      processedDocuments: processedFiles,
      stats,
      processingSummary,
      message: `Reindexing completed successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Reindex error:', error);
    
    // Update status with error
    const { eventId } = await req.json().catch(() => ({}));
    if (eventId) {
      await supabase
        .from('event_index_status')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('event_id', eventId)
        .catch(console.error);
    }

    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});