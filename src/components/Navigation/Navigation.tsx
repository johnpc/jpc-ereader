import React from 'react';
import './Navigation.css';

interface NavigationProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  onRefresh: () => void;
  isSearching: boolean;
  totalBooks: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  searchQuery,
  onSearchChange,
  onSearchClear,
  onRefresh,
  isSearching,
  totalBooks,
}) => {
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleClearSearch = () => {
    onSearchClear();
  };

  return (
    <nav className="navigation">
      <div className="navigation__container">
        {/* Logo/Title */}
        <div className="navigation__brand">
          <h1 className="navigation__title">
            📚 JPC E-Reader
          </h1>
          <span className="navigation__subtitle">
            {totalBooks} books available
          </span>
        </div>

        {/* Search */}
        <div className="navigation__search">
          <form onSubmit={handleSearchSubmit} className="navigation__search-form">
            <div className="navigation__search-input-container">
              <input
                type="text"
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={handleSearchInput}
                className="navigation__search-input"
                aria-label="Search books"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="navigation__search-clear"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
          
          {isSearching && (
            <div className="navigation__search-status">
              Searching for "{searchQuery}"...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="navigation__actions">
          <button
            onClick={onRefresh}
            className="navigation__refresh-button"
            aria-label="Refresh book catalog"
            title="Refresh book catalog"
          >
            🔄
          </button>
        </div>
      </div>
    </nav>
  );
};
