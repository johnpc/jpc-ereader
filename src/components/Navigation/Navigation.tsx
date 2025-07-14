import React from 'react';
import './Navigation.css';

interface NavigationProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  isSearching: boolean;
  totalBooks: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  searchQuery,
  onSearchChange,
  onSearchClear,
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
            📚 ereader.jpc
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
                placeholder="Title, author, etc..."
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
              🔍 Filtering "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
