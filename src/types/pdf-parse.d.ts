declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFOptions {
    max?: number;
    pagerender?: any;
  }

  function pdfParse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}

declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: any[];
  }
  function convertToHtml(input: { path?: string; buffer?: Buffer }): Promise<ConversionResult>;
  function extractRawText(input: { path?: string; buffer?: Buffer }): Promise<ConversionResult>;
}
