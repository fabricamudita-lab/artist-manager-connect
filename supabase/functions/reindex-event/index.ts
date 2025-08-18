import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Text extraction functions
const extractTextFromFile = async (file: Blob, fileName: string): Promise<string[]> => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  try {
    switch (extension) {
      case 'txt':
      case 'md':
        return [await file.text()];
      
      case 'csv':
        const csvText = await file.text();
        return csvText.split('\n').filter(line => line.trim());
      
      case 'json':
        const jsonText = await file.text();
        const jsonData = JSON.parse(jsonText);
        return [JSON.stringify(jsonData, null, 2)];
      
      default:
        // For unsupported formats, return metadata only
        return [`File: ${fileName} (${extension} format - content not extracted)`];
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    return [`File: ${fileName} (extraction failed: ${error.message})`];
  }
};

// Split text into chunks of ~1500-2000 tokens (roughly 750-1000 words)
const chunkText = (text: string, maxChunkSize = 1500): string[] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence + '. ';
    
    if (potentialChunk.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + '. ';
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
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

            // Extract text
            const textChunks = await extractTextFromFile(fileData, file.name);
            
            // Process each chunk
            for (let i = 0; i < textChunks.length; i++) {
              const chunk = textChunks[i];
              const embedding = await generateEmbedding(chunk);
              
              await supabase
                .from('event_document_index')
                .insert({
                  event_id: eventId,
                  file_name: file.name,
                  file_path: filePath,
                  subfolder: subfolder,
                  content_fragment: chunk,
                  fragment_index: i,
                  metadata: {
                    file_size: file.metadata?.size || 0,
                    last_modified: file.metadata?.lastModified || file.updated_at,
                    content_type: file.metadata?.mimetype || 'unknown'
                  },
                  embedding_data: embedding
                });
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
          }
        }
      } catch (folderError) {
        console.error(`Error processing folder ${subfolder}:`, folderError);
      }
    }

    // Update final status
    await supabase
      .from('event_index_status')
      .update({
        status: 'completed',
        total_documents: totalFiles,
        processed_documents: processedFiles,
        last_indexed_at: new Date().toISOString(),
        error_message: null
      })
      .eq('event_id', eventId);

    console.log(`Reindex completed for event ${eventId}: ${processedFiles}/${totalFiles} files processed`);

    return new Response(JSON.stringify({
      success: true,
      totalDocuments: totalFiles,
      processedDocuments: processedFiles,
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