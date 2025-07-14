import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reader } from '../components/Reader/Reader';
import { useBooks } from '../hooks/useBooks';
import { useReader } from '../hooks/useReader';
import { epubService } from '../services/epubService';
import { storageService } from '../services/storageService';
import type { Book } from '../types/book';
import type { TableOfContentsItem } from '../types/reader';
import './ReaderPage.css';

export const ReaderPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { library } = useBooks();
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [bookNotFound, setBookNotFound] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);

  const {
    settings,
    updateSettings,
    saveProgress,
  } = useReader();

  // Find the book by ID when library loads or bookId changes
  useEffect(() => {
    if (!bookId) {
      navigate('/');
      return;
    }

    if (library.loading) {
      return; // Wait for library to load
    }

    const decodedBookId = decodeURIComponent(bookId);
    const book = library.books.find(b => b.id === decodedBookId);
    
    if (book) {
      setCurrentBook(book);
      setBookNotFound(false);
      
      // Add to reading history
      storageService.addToReadingHistory(book.id, book.title, book.author);
      
      // Load table of contents
      loadTableOfContents(book);
    } else {
      setBookNotFound(true);
    }
  }, [bookId, library.books, library.loading, navigate]);

  // Load table of contents for the book
  const loadTableOfContents = async (book: Book) => {
    try {
      console.log('📑 ReaderPage: Loading table of contents for:', book.title);
      
      const toc = await epubService.getTableOfContents(book.id);
      setTableOfContents(toc);
      
      console.log('📑 ReaderPage: Table of contents loaded:', toc.length, 'items');
    } catch (error) {
      console.error('❌ ReaderPage: Error loading table of contents:', error);
      setTableOfContents([]); // Set empty array on error
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    updateSettings(newSettings);
  };

  const handleProgressUpdate = (location: string, progress: number) => {
    if (currentBook) {
      saveProgress(currentBook.id, location, progress);
    }
  };

  // Show loading while library is loading
  if (library.loading) {
    return (
      <div className="reader-page-loading">
        <div className="reader-page-loading__content">
          <div className="reader-page-loading__spinner"></div>
          <p>Loading library...</p>
        </div>
      </div>
    );
  }

  // Show error if book not found
  if (bookNotFound || !currentBook) {
    return (
      <div className="reader-page-error">
        <div className="reader-page-error__content">
          <h2>Book Not Found</h2>
          <p>The requested book could not be found in the library.</p>
          <button 
            onClick={() => navigate('/')}
            className="reader-page-error__button"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  // Show library error
  if (library.error) {
    return (
      <div className="reader-page-error">
        <div className="reader-page-error__content">
          <h2>Library Error</h2>
          <p>{library.error}</p>
          <button 
            onClick={() => navigate('/')}
            className="reader-page-error__button"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <Reader
      book={currentBook}
      settings={settings}
      tableOfContents={tableOfContents}
      onClose={handleClose}
      onSettingsChange={handleSettingsChange}
      onProgressUpdate={handleProgressUpdate}
    />
  );
};
