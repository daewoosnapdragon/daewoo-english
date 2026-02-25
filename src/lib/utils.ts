export function cleanTitle(filename: string): string {
  let name = filename.replace(/\.[^/.]+$/, ''); // remove extension
  name = name.replace(/[-_]+/g, ' ');
  name = name.replace(/\b\w/g, c => c.toUpperCase());
  return name.trim();
}

export function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'pdf',
    pptx: 'presentation', ppt: 'presentation',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
    doc: 'document', docx: 'document',
  };
  return map[ext] || 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function parseBookModule(filename: string): { book: number; module: number } {
  const m = filename.match(/^(\d+)\.(\d+)[\s_\-]/);
  if (m) return { book: parseInt(m[1]), module: parseInt(m[2]) };
  
  const m2 = filename.match(/(\d+)\.(\d+)/);
  if (m2) {
    const b = parseInt(m2[1]);
    const mod = parseInt(m2[2]);
    if (b >= 1 && b <= 4 && mod >= 1 && mod <= 20) {
      return { book: b, module: mod };
    }
  }
  return { book: 0, module: 0 };
}

export const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'pptx', 'ppt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'svg'
]);

export function isAllowedFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.has(ext);
}
