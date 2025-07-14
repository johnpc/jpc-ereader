import type { Book, OPDSFeed, OPDSEntry } from '../types/book';

// Use the books endpoint instead of the navigation feed
const OPDS_URL = 'https://cors-proxy.jpc.io/api/proxy?url=https://ebooks.jpc.io/opds/new';
const BASE_URL = 'https://ebooks.jpc.io';
const PROXY_BASE = 'https://cors-proxy.jpc.io/api/proxy?url=';

export class OPDSService {
  private resolveUrl(url: string): string {
    if (!url) return '';
    
    let absoluteUrl: string;
    
    // Convert to absolute URL if relative
    if (url.startsWith('http://') || url.startsWith('https://')) {
      absoluteUrl = url;
    } else {
      absoluteUrl = BASE_URL + (url.startsWith('/') ? url : '/' + url);
    }
    
    // Always proxy external URLs (anything not from localhost)
    if (absoluteUrl.startsWith('http://localhost') || absoluteUrl.startsWith('https://localhost')) {
      console.log('🔗 OPDSService: Local URL, not proxying:', absoluteUrl);
      return absoluteUrl;
    }
    
    // Proxy all external URLs
    const proxiedUrl = PROXY_BASE + encodeURIComponent(absoluteUrl);
    console.log('🔗 OPDSService: Resolved URL:', url, '→', proxiedUrl);
    return proxiedUrl;
  }

  private async fetchXML(url: string): Promise<string> {
    console.log('🔄 OPDSService: Starting fetch from URL:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/atom+xml, application/xml, text/xml',
        },
      });
      
      console.log('📡 OPDSService: Response status:', response.status, response.statusText);
      console.log('📡 OPDSService: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const xmlData = await response.text();
      console.log('📄 OPDSService: Received XML data length:', xmlData.length);
      console.log('📄 OPDSService: XML data preview (first 500 chars):', xmlData.substring(0, 500));
      
      return xmlData;
    } catch (error) {
      console.error('❌ OPDSService: Error fetching OPDS feed:', error);
      throw new Error('Failed to fetch OPDS feed');
    }
  }

  private parseOPDSFeed(xmlData: string): Promise<OPDSFeed> {
    console.log('🔍 OPDSService: Starting XML parsing...');
    
    return new Promise((resolve, reject) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlData, 'application/xml');
        
        console.log('🔍 OPDSService: XML parsed, document element:', doc.documentElement.tagName);
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          console.error('❌ OPDSService: XML parsing error:', parserError.textContent);
          reject(new Error('Failed to parse OPDS feed: Invalid XML'));
          return;
        }

        const feed = doc.documentElement;
        console.log('🔍 OPDSService: Root element tag name:', feed.tagName);
        console.log('🔍 OPDSService: Root element namespace:', feed.namespaceURI);
        
        if (feed.tagName !== 'feed') {
          console.error('❌ OPDSService: Invalid root element, expected "feed", got:', feed.tagName);
          reject(new Error('Invalid OPDS feed: Missing feed element'));
          return;
        }

        // Extract feed metadata
        const feedId = this.getElementText(feed, 'id') || '';
        const feedTitle = this.getElementText(feed, 'title') || 'OPDS Feed';
        const feedUpdated = this.getElementText(feed, 'updated') || new Date().toISOString();

        console.log('📋 OPDSService: Feed metadata:', { feedId, feedTitle, feedUpdated });

        // Extract entries
        const entryElements = Array.from(feed.querySelectorAll('entry'));
        console.log('📚 OPDSService: Found', entryElements.length, 'entry elements');

        if (entryElements.length === 0) {
          console.warn('⚠️ OPDSService: No entry elements found in feed');
          console.log('🔍 OPDSService: Feed children:', Array.from(feed.children).map(child => child.tagName));
        }

        const opdsEntries: OPDSEntry[] = entryElements.map((entry, index) => {
          const entryData = {
            id: this.getElementText(entry, 'id') || `entry-${index}`,
            title: this.getElementText(entry, 'title') || 'Unknown Title',
            author: this.extractAuthor(entry),
            summary: this.getElementText(entry, 'summary') || this.getElementText(entry, 'content') || '',
            links: this.extractLinks(entry),
            published: this.getElementText(entry, 'published'),
            updated: this.getElementText(entry, 'updated'),
            categories: this.extractCategories(entry),
          };
          
          console.log(`📖 OPDSService: Entry ${index + 1}:`, {
            id: entryData.id,
            title: entryData.title,
            author: entryData.author,
            linksCount: entryData.links.length,
            links: entryData.links
          });
          
          return entryData;
        });

        // Extract feed links
        const feedLinks = this.extractLinks(feed);
        console.log('🔗 OPDSService: Feed links:', feedLinks);

        const result = {
          id: feedId,
          title: feedTitle,
          updated: feedUpdated,
          entries: opdsEntries,
          links: feedLinks,
        };

        console.log('✅ OPDSService: Successfully parsed feed with', opdsEntries.length, 'entries');
        resolve(result);
      } catch (parseError) {
        console.error('❌ OPDSService: Error parsing OPDS feed:', parseError);
        reject(new Error('Failed to parse OPDS feed structure'));
      }
    });
  }

  private getElementText(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    const text = element?.textContent?.trim() || '';
    if (text) {
      console.log(`🏷️ OPDSService: Found ${tagName}:`, text);
    }
    return text;
  }

  private extractAuthor(entry: Element): string {
    const authorElement = entry.querySelector('author');
    if (authorElement) {
      const nameElement = authorElement.querySelector('name');
      if (nameElement) {
        const authorName = nameElement.textContent?.trim() || 'Unknown Author';
        console.log('👤 OPDSService: Found author name:', authorName);
        return authorName;
      }
      const authorText = authorElement.textContent?.trim() || 'Unknown Author';
      console.log('👤 OPDSService: Found author text:', authorText);
      return authorText;
    }
    console.log('👤 OPDSService: No author found, using default');
    return 'Unknown Author';
  }

  private extractLinks(element: Element): any[] {
    const linkElements = Array.from(element.querySelectorAll('link'));
    const links = linkElements.map((link) => {
      const href = link.getAttribute('href') || '';
      return {
        href: this.resolveUrl(href), // Resolve URLs through proxy
        type: link.getAttribute('type') || '',
        rel: link.getAttribute('rel') || '',
        title: link.getAttribute('title') || '',
        originalHref: href, // Keep original for debugging
      };
    });
    
    if (links.length > 0) {
      console.log('🔗 OPDSService: Extracted links:', links);
    }
    
    return links;
  }

  private extractCategories(entry: Element): any[] {
    const categoryElements = Array.from(entry.querySelectorAll('category'));
    const categories = categoryElements.map((cat) => ({
      term: cat.getAttribute('term') || '',
      label: cat.getAttribute('label') || cat.getAttribute('term') || '',
    }));
    
    if (categories.length > 0) {
      console.log('🏷️ OPDSService: Extracted categories:', categories);
    }
    
    return categories;
  }

  private convertOPDSEntryToBook(entry: OPDSEntry): Book | null {
    console.log('🔄 OPDSService: Converting entry to book:', entry.title);
    
    // First, look specifically for EPUB links with proper type
    let downloadLink = entry.links.find(
      link => link.type === 'application/epub+zip'
    );
    
    // If no typed EPUB link, look for EPUB in the URL path
    if (!downloadLink) {
      downloadLink = entry.links.find(
        link => link.href.includes('/epub/') && 
                link.rel === 'http://opds-spec.org/acquisition'
      );
    }
    
    // If still no EPUB link, look for any acquisition link that's not MOBI
    if (!downloadLink) {
      downloadLink = entry.links.find(
        link => link.rel === 'http://opds-spec.org/acquisition' &&
                !link.href.includes('/mobi/') &&
                !link.href.toLowerCase().includes('.mobi')
      );
    }
    
    // Final fallback: any acquisition link (but we'll validate format later)
    if (!downloadLink) {
      downloadLink = entry.links.find(
        link => link.rel === 'http://opds-spec.org/acquisition'
      );
    }

    const coverLink = entry.links.find(
      link => link.type?.startsWith('image/') || 
              link.rel === 'http://opds-spec.org/image' ||
              link.rel === 'http://opds-spec.org/image/thumbnail' ||
              link.href.includes('cover')
    );

    console.log('🔗 OPDSService: Download link found:', !!downloadLink, downloadLink);
    console.log('🖼️ OPDSService: Cover link found:', !!coverLink, coverLink);

    if (!downloadLink) {
      console.warn('⚠️ OPDSService: No download link found for entry:', entry.title);
      console.log('🔍 OPDSService: Available links for this entry:', entry.links);
      return null;
    }

    // Check if the final download link is MOBI (additional safety check)
    if (downloadLink.href.includes('/mobi/') || downloadLink.href.toLowerCase().includes('.mobi')) {
      console.warn('⚠️ OPDSService: Skipping MOBI file (not supported):', entry.title);
      console.log('🔍 OPDSService: Available links for this entry:', entry.links);
      return null;
    }

    const book = {
      id: entry.id,
      title: entry.title,
      author: entry.author,
      description: entry.summary,
      coverUrl: coverLink?.href, // This is now properly resolved through proxy
      downloadUrl: downloadLink.href, // This is now properly resolved through proxy
      publishedDate: entry.published,
      categories: entry.categories?.map(cat => cat.label || cat.term),
    };

    console.log('✅ OPDSService: Successfully converted to book:', {
      title: book.title,
      coverUrl: book.coverUrl,
      downloadUrl: book.downloadUrl
    });
    return book;
  }

  async fetchBooks(): Promise<Book[]> {
    console.log('🚀 OPDSService: Starting fetchBooks...');
    
    try {
      const xmlData = await this.fetchXML(OPDS_URL);
      const feed = await this.parseOPDSFeed(xmlData);
      
      console.log('📊 OPDSService: Feed parsed, converting', feed.entries.length, 'entries to books...');
      
      const books = feed.entries
        .map(entry => this.convertOPDSEntryToBook(entry))
        .filter((book): book is Book => book !== null);

      console.log('📚 OPDSService: Successfully converted', books.length, 'books out of', feed.entries.length, 'entries');
      
      if (books.length === 0) {
        console.warn('⚠️ OPDSService: No books were successfully converted!');
        console.log('🔍 OPDSService: Feed entries that failed conversion:', 
          feed.entries.map(entry => ({
            title: entry.title,
            linksCount: entry.links.length,
            links: entry.links
          }))
        );
      }

      return books;
    } catch (error) {
      console.error('❌ OPDSService: Error in fetchBooks:', error);
      throw error;
    }
  }
}

export const opdsService = new OPDSService();
