export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  downloadUrl: string;
  publishedDate?: string;
  language?: string;
  isbn?: string;
  categories?: string[];
}

export interface OPDSEntry {
  id: string;
  title: string;
  author: string;
  summary?: string;
  links: OPDSLink[];
  published?: string;
  updated?: string;
  categories?: OPDSCategory[];
}

export interface OPDSLink {
  href: string;
  type: string;
  rel: string;
  title?: string;
}

export interface OPDSCategory {
  term: string;
  label?: string;
}

export interface OPDSFeed {
  id: string;
  title: string;
  updated: string;
  entries: OPDSEntry[];
  links: OPDSLink[];
}

export interface BookLibrary {
  books: Book[];
  loading: boolean;
  error: string | null;
}
