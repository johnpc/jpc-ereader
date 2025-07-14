import type { Book } from '../types/book';
import type { TableOfContentsItem } from '../types/reader';

// Lazy import epub.js to avoid early initialization issues
let ePub: any = null;

const getEpub = async () => {
  if (!ePub) {
    try {
      const epubModule = await import('epubjs');
      ePub = epubModule.default;
    } catch (error) {
      console.error('Failed to load epub.js:', error);
      throw new Error('Failed to load EPUB library');
    }
  }
  return ePub;
};

export class EPUBService {
  private books: Map<string, any> = new Map();
  private renditions: Map<string, any> = new Map();

  async loadBook(book: Book): Promise<any> {
    try {
      // Check if book is already loaded
      if (this.books.has(book.id)) {
        console.log('📚 EPUBService: Book already loaded, returning cached instance');
        return this.books.get(book.id)!;
      }

      // Lazy load epub.js
      const EpubConstructor = await getEpub();
      
      console.log('📚 EPUBService: Loading book:', book.title);
      console.log('📚 EPUBService: Download URL:', book.downloadUrl);
      
      let epubBook;
      
      // Always download through proxy for external URLs to avoid CORS issues
      if (book.downloadUrl.includes('cors-proxy.jpc.io') || 
          (!book.downloadUrl.includes('localhost') && !book.downloadUrl.startsWith('blob:'))) {
        console.log('📚 EPUBService: Downloading EPUB file through proxy...');
        
        // Download the EPUB file first
        const response = await fetch(book.downloadUrl, {
          headers: {
            'Accept': 'application/epub+zip, application/octet-stream, */*',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download EPUB: ${response.status} ${response.statusText}`);
        }
        
        // Get the file as ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        console.log('📚 EPUBService: Downloaded file, size:', arrayBuffer.byteLength, 'bytes');
        
        // Validate file format
        const uint8Array = new Uint8Array(arrayBuffer);
        const header = Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('📚 EPUBService: File header (hex):', header);
        
        // Check for common file signatures
        const headerString = String.fromCharCode(...uint8Array.slice(0, 20));
        console.log('📚 EPUBService: File header (string):', headerString);
        
        // EPUB files should start with "PK" (ZIP signature) since EPUB is a ZIP file
        if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
          console.log('✅ EPUBService: File appears to be a ZIP file (good for EPUB)');
        } else if (headerString.includes('BOOKMOBI') || headerString.includes('TPZ')) {
          console.error('❌ EPUBService: File appears to be a MOBI file, not EPUB!');
          throw new Error('Downloaded file is MOBI format, not EPUB. Please check your Calibre-Web OPDS configuration.');
        } else {
          console.warn('⚠️ EPUBService: Unknown file format, attempting to process anyway...');
        }
        
        // Create ePub book instance from ArrayBuffer
        // This is the key fix - epub.js handles ArrayBuffer better for CORS scenarios
        epubBook = EpubConstructor(arrayBuffer);
        console.log('📚 EPUBService: Created EPUB book from ArrayBuffer');
      } else {
        console.log('📚 EPUBService: Using direct URL for EPUB loading (local or blob URL)');
        // Create new ePub book instance from URL (for local URLs)
        epubBook = EpubConstructor(book.downloadUrl);
      }
      
      // Store the book instance
      this.books.set(book.id, epubBook);
      
      console.log('✅ EPUBService: Successfully created EPUB book instance');
      
      // Set up error handling for the book instance
      epubBook.ready.catch((error: any) => {
        console.error('❌ EPUBService: Book ready promise rejected:', error);
        // Don't throw here, let the caller handle it
      });
      
      return epubBook;
    } catch (error) {
      console.error('❌ EPUBService: Error loading EPUB book:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to download')) {
          throw new Error('Unable to download the book file. Please check your internet connection and try again.');
        } else if (error.message.includes('MOBI format')) {
          throw error; // Pass through MOBI error as-is
        } else if (error.message.includes('Failed to load EPUB library')) {
          throw new Error('EPUB reader library failed to load. Please refresh the page and try again.');
        }
      }
      
      throw new Error('Failed to load EPUB book. The file may be corrupted or in an unsupported format.');
    }
  }

  async getTableOfContents(bookId: string): Promise<TableOfContentsItem[]> {
    console.log('📑 EPUBService: Getting table of contents for book:', bookId);
    
    const book = this.books.get(bookId);
    if (!book) {
      console.error('❌ EPUBService: Book not found in loaded books');
      throw new Error('Book not loaded');
    }

    try {
      console.log('📑 EPUBService: Waiting for book to be ready...');
      
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for book to be ready')), 15000);
      });
      
      await Promise.race([book.ready, timeoutPromise]);
      console.log('📑 EPUBService: Book is ready, accessing navigation...');
      
      const navigation = book.navigation;
      console.log('📑 EPUBService: Navigation object:', navigation);
      
      if (!navigation || !navigation.toc) {
        console.log('📑 EPUBService: No navigation or TOC found, returning empty array');
        return [];
      }

      console.log('📑 EPUBService: Converting navigation items to TOC...');
      const toc = this.convertNavItemsToTOC(navigation.toc);
      console.log('📑 EPUBService: TOC conversion complete, items:', toc.length);
      return toc;
    } catch (error) {
      console.error('❌ EPUBService: Error getting table of contents:', error);
      
      // If it's a timeout or format error, provide more helpful message
      if (error instanceof Error && error.message.includes('Timeout')) {
        throw new Error('This file may not be a valid EPUB format or is corrupted');
      }
      
      return [];
    }
  }

  private convertNavItemsToTOC(navItems: any[]): TableOfContentsItem[] {
    return navItems.map((item, index) => ({
      id: item.id || `toc-${index}`,
      label: item.label || 'Untitled',
      href: item.href || '',
      subitems: item.subitems ? this.convertNavItemsToTOC(item.subitems) : undefined,
    }));
  }

  async getBookMetadata(bookId: string): Promise<any> {
    const book = this.books.get(bookId);
    if (!book) {
      throw new Error('Book not loaded');
    }

    try {
      await book.ready;
      return (book as any).packaging?.metadata || null;
    } catch (error) {
      console.error('Error getting book metadata:', error);
      return null;
    }
  }

  async getCoverImage(bookId: string): Promise<string | null> {
    const book = this.books.get(bookId);
    if (!book) {
      throw new Error('Book not loaded');
    }

    try {
      await book.ready;
      const cover = await book.coverUrl();
      return cover;
    } catch (error) {
      console.error('Error getting cover image:', error);
      return null;
    }
  }

  getBook(bookId: string): any | null {
    return this.books.get(bookId) || null;
  }

  // Store rendition reference to manage it separately
  setRendition(bookId: string, rendition: any): void {
    this.renditions.set(bookId, rendition);
  }

  getRendition(bookId: string): any | null {
    return this.renditions.get(bookId) || null;
  }

  unloadBook(bookId: string): void {
    // Clean up rendition first
    const rendition = this.renditions.get(bookId);
    if (rendition) {
      try {
        // Don't call destroy on rendition to avoid removeAllListeners error
        // Just remove our reference
        this.renditions.delete(bookId);
      } catch (error) {
        console.warn('Error cleaning up rendition:', error);
      }
    }

    // Clean up book
    const book = this.books.get(bookId);
    if (book) {
      try {
        // Only destroy if the method exists and is safe to call
        if (typeof book.destroy === 'function') {
          // Wrap in try-catch to handle any internal errors
          book.destroy();
        }
      } catch (error) {
        console.warn('Error destroying book (this is usually safe to ignore):', error);
      }
      this.books.delete(bookId);
    }
  }

  unloadAllBooks(): void {
    // Clean up all renditions first
    this.renditions.forEach((_, bookId) => {
      try {
        // Don't call destroy on renditions to avoid removeAllListeners error
        // Just clear our references
      } catch (error) {
        console.warn('Error cleaning up rendition:', bookId, error);
      }
    });
    this.renditions.clear();

    // Clean up all books
    this.books.forEach((book, bookId) => {
      try {
        if (typeof book.destroy === 'function') {
          book.destroy();
        }
      } catch (error) {
        console.warn('Error destroying book (this is usually safe to ignore):', bookId, error);
      }
    });
    this.books.clear();
  }
}

export const epubService = new EPUBService();
