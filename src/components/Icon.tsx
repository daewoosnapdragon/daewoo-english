'use client';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 20, className = '', filled = false, style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

// Category icon mapping
export const CATEGORY_ICON_MAP: Record<string, string> = {
  grammar: 'edit_note',
  reading: 'menu_book',
  writing: 'draw',
  phonics: 'abc',
  projects: 'science',
  seasonal: 'park',
  assessments: 'quiz',
  sel: 'favorite',
  novel_study: 'auto_stories',
  misc: 'folder',
};

// File type icon mapping
export const FILE_TYPE_ICON_MAP: Record<string, string> = {
  pdf: 'picture_as_pdf',
  presentation: 'slideshow',
  image: 'image',
  document: 'description',
  other: 'insert_drive_file',
};
