import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import './ReadingHistory.css';

interface ReadingHistoryProps {
  onBookSelect?: (bookId: string) => void;
  maxItems?: number;
}

export const ReadingHistory: React.FC<ReadingHistoryProps> = ({ 
  onBookSelect, 
  maxItems = 5 
}) => {
  const [history, setHistory] = useState<Array<{
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    lastRead: string;
  }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadHistory = () => {
      const readingHistory = storageService.getReadingHistory();
      setHistory(readingHistory.slice(0, maxItems));
    };

    loadHistory();
    
    // Listen for storage changes to update history
    const handleStorageChange = () => {
      loadHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for when we update localStorage programmatically
    window.addEventListener('reading-history-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('reading-history-updated', handleStorageChange);
    };
  }, [maxItems]);

  const formatLastRead = (lastRead: string) => {
    const date = new Date(lastRead);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleBookClick = (bookId: string) => {
    if (onBookSelect) {
      onBookSelect(bookId);
    }
  };

  const getProgress = (bookId: string) => {
    return storageService.getBookProgress(bookId);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="reading-history">
      <div className="reading-history__header">
        <h3 className="reading-history__title">
          📚 Recently Read
        </h3>
        {history.length > 3 && (
          <button
            className="reading-history__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Show less' : 'Show more'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      <div className={`reading-history__list ${isExpanded ? 'reading-history__list--expanded' : ''}`}>
        {history.slice(0, isExpanded ? maxItems : 3).map((item) => {
          const progress = getProgress(item.bookId);
          const hasProgress = progress && progress.progress > 0.01;

          return (
            <div
              key={item.bookId}
              className={`reading-history__item ${hasProgress ? 'reading-history__item--has-progress' : ''}`}
              onClick={() => handleBookClick(item.bookId)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBookClick(item.bookId);
                }
              }}
            >
              <div className="reading-history__book-info">
                <div className="reading-history__book-title">
                  {item.bookTitle}
                </div>
                <div className="reading-history__book-author">
                  by {item.bookAuthor}
                </div>
              </div>

              <div className="reading-history__meta">
                {hasProgress && (
                  <div className="reading-history__progress">
                    {Math.round(progress.progress * 100)}%
                  </div>
                )}
                <div className="reading-history__time">
                  {formatLastRead(item.lastRead)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {history.length > maxItems && (
        <div className="reading-history__footer">
          <button
            className="reading-history__view-all"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : `View All ${history.length} Books`}
          </button>
        </div>
      )}
    </div>
  );
};
