import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handlePdf(args: Record<string, unknown>): Promise<{
  data: string;
  pageCount: number;
}> {
  const tabId = await resolveTabId(args);
  const landscape = (args.landscape as boolean) || false;
  const printBackground = (args.printBackground as boolean) ?? true;
  const scale = (args.scale as number) || 1;

  await dbg.acquire(tabId);

  try {
    const result = await dbg.sendCommand(tabId, 'Page.printToPDF', {
      landscape,
      printBackground,
      scale,
      paperWidth: 8.27, // A4
      paperHeight: 11.69,
      marginTop: 0.4,
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4,
    }) as { data: string; stream?: string };

    // Rough page count estimate from PDF data size
    const pdfSize = Math.ceil(result.data.length * 0.75); // base64 -> bytes
    const pageCount = Math.max(1, Math.ceil(pdfSize / 50000)); // rough estimate

    return {
      data: result.data,
      pageCount,
    };
  } finally {
    await dbg.release(tabId);
  }
}
