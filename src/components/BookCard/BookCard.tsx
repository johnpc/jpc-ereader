import React from 'react';
import type { Book } from '../../types/book';
import { storageService } from '../../services/storageService';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  // Get reading progress for this book
  const progress = storageService.getBookProgress(book.id);
  const hasProgress = progress && progress.progress > 0.01; // Show progress if more than 1%
  
  const handleClick = () => {
    onClick(book);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(book);
    }
  };

  const formatLastRead = (lastRead: string) => {
    const date = new Date(lastRead);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  return (
    <div 
      className={`book-card ${hasProgress ? 'book-card--has-progress' : ''}`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`${hasProgress ? 'Continue reading' : 'Open'} ${book.title} by ${book.author}${hasProgress ? ` (${Math.round(progress.progress * 100)}% complete)` : ''}`}
    >
      <div className="book-card__cover">
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={`Cover of ${book.title}`}
            className="book-card__cover-image"
            loading="lazy"
          />
        ) : (
          <div className="book-card__cover-placeholder">
            <div className="book-card__cover-icon">📖</div>
          </div>
        )}
        
        {/* Progress indicator overlay */}
        {hasProgress && (
          <div className="book-card__progress-overlay">
            <div className="book-card__progress-circle">
              <svg className="book-card__progress-svg" viewBox="0 0 36 36">
                <path
                  className="book-card__progress-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="book-card__progress-bar"
                  strokeDasharray={`${progress.progress * 100}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="book-card__progress-text">
                {Math.round(progress.progress * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="book-card__content">
        <h3 className="book-card__title" title={book.title}>
          {book.title}
        </h3>
        
        <p className="book-card__author" title={book.author}>
          {book.author}
        </p>
        
        {/* Reading progress info */}
        {(hasProgress || progress?.lastRead) && (
          <div className="book-card__reading-info">
            {hasProgress && (
              <span className="book-card__continue-badge">
                📖 Continue Reading
              </span>
            )}
            {progress?.lastRead ? (
              <span className="book-card__last-read">
                {formatLastRead(progress.lastRead)}
                {hasProgress && (
                  <>
                    {' • '}
                    <strong>{Math.round(progress.progress * 100)}%</strong>
                  </>
                )}
              </span>
            ) : hasProgress ? (
              <span className="book-card__last-read">
                <strong>{Math.round(progress.progress * 100)}%</strong> complete
              </span>
            ) : null}
          </div>
        )}
        
        {book.description && !hasProgress && (
          <p className="book-card__description" title={book.description}>
            {book.description}
          </p>
        )}
        
        {book.categories && book.categories.length > 0 && !hasProgress && (
          <div className="book-card__categories">
            {book.categories.slice(0, 2).map((category, index) => (
              <span key={index} className="book-card__category">
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
