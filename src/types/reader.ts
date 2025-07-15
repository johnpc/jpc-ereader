export interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark';
  fontFamily: string;
  lineHeight: number;
  margin: number;
  spreadMode: 'auto' | 'single' | 'double';
}

export interface BookProgress {
  bookId: string;
  currentLocation: string;
  progress: number;
  lastRead: Date;
}

export interface Bookmark {
  id: string;
  bookId: string;
  location: string;
  text: string;
  note?: string;
  createdAt: Date;
}

export interface TableOfContentsItem {
  id: string;
  label: string;
  href: string;
  subitems?: TableOfContentsItem[];
}

export interface ReaderState {
  currentBook: string | null;
  isReaderOpen: boolean;
  settings: ReaderSettings;
  progress: Record<string, BookProgress>;
  bookmarks: Bookmark[];
  tableOfContents: TableOfContentsItem[];
}
