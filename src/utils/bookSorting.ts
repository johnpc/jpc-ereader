import type { Book } from '../types/book';
import { storageService } from '../services/storageService';

/**
 * Sort books with multi-level priority:
 * 1. Most recently read (lastRead timestamp) - highest priority
 * 2. Most progress (reading progress percentage) - second priority  
 * 3. Alphabetically by title - final priority
 */
export function sortBooksByPriority(books: Book[]): Book[] {
  const allProgress = storageService.getAllBookProgress();
  
  return books.sort((a, b) => {
    const progressA = allProgress[a.id];
    const progressB = allProgress[b.id];
    
    // Priority 1: Most recently read first
    const lastReadA = progressA?.lastRead ? new Date(progressA.lastRead).getTime() : 0;
    const lastReadB = progressB?.lastRead ? new Date(progressB.lastRead).getTime() : 0;
    
    if (lastReadA !== lastReadB) {
      return lastReadB - lastReadA; // Most recent first (descending)
    }
    
    // Priority 2: Most progress first (for books with same lastRead or no lastRead)
    const progressValueA = progressA?.progress || 0;
    const progressValueB = progressB?.progress || 0;
    
    if (progressValueA !== progressValueB) {
      return progressValueB - progressValueA; // Most progress first (descending)
    }
    
    // Priority 3: Alphabetical by title (for books with same progress)
    return a.title.localeCompare(b.title, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
}

/**
 * Get sorting statistics for debugging
 */
export function getBookSortingStats(books: Book[]): {
  withProgress: number;
  withLastRead: number;
  totalBooks: number;
  mostRecentRead?: string;
  highestProgress?: number;
} {
  const allProgress = storageService.getAllBookProgress();
  
  let withProgress = 0;
  let withLastRead = 0;
  let mostRecentTimestamp = 0;
  let highestProgress = 0;
  let mostRecentRead: string | undefined;
  
  books.forEach(book => {
    const progress = allProgress[book.id];
    
    if (progress) {
      if (progress.progress > 0) {
        withProgress++;
        highestProgress = Math.max(highestProgress, progress.progress);
      }
      
      if (progress.lastRead) {
        withLastRead++;
        const timestamp = new Date(progress.lastRead).getTime();
        if (timestamp > mostRecentTimestamp) {
          mostRecentTimestamp = timestamp;
          mostRecentRead = book.title;
        }
      }
    }
  });
  
  return {
    withProgress,
    withLastRead,
    totalBooks: books.length,
    mostRecentRead,
    highestProgress: Math.round(highestProgress * 100) // Convert to percentage
  };
}
