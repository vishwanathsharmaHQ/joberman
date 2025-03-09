declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  export default function pdfParse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PDFData>;
} 