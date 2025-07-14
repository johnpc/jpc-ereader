import { Navigation } from './components/Navigation/Navigation';
import { BookGrid } from './components/BookGrid/BookGrid';
import { Reader } from './components/Reader/Reader';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useBooks } from './hooks/useBooks';
import { useReader } from './hooks/useReader';
import type { Book } from './types/book';
import './App.css';

function App() {
  const {
    library,
    filteredBooks,
    searchQuery,
    handleSearch,
    clearSearch,
    isSearching,
  } = useBooks();

  const {
    readerState,
    openBook,
    closeReader,
    updateSettings,
    updateProgress,
  } = useReader();

  const handleBookClick = async (book: Book) => {
    try {
      await openBook(book);
    } catch (error) {
      console.error('Failed to open book:', error);
      // You could add a toast notification here
      alert('Failed to open book. Please try again.');
    }
  };

  const handleCloseReader = () => {
    closeReader();
  };

  return (
    <div className="app">
      {(() => {
        console.log('🔍 App: Render check - isReaderOpen:', readerState.isReaderOpen, 'currentBook:', readerState.currentBook);
        console.log('🔍 App: Filtered books count:', filteredBooks.length);
        
        if (readerState.isReaderOpen && readerState.currentBook) {
          const foundBook = filteredBooks.find(b => b.id === readerState.currentBook);
          console.log('🔍 App: Looking for book with ID:', readerState.currentBook);
          console.log('🔍 App: Found book:', foundBook);
          
          if (!foundBook) {
            console.error('❌ App: Book not found in filtered books!');
            console.log('🔍 App: Available book IDs:', filteredBooks.map(b => b.id));
            return (
              <div className="app__error">
                <h2>Error: Book not found</h2>
                <p>The selected book could not be found in the current library.</p>
                <button onClick={handleCloseReader}>Back to Library</button>
              </div>
            );
          }
          
          return (
            <Reader
              book={foundBook}
              settings={readerState.settings}
              tableOfContents={readerState.tableOfContents}
              onClose={handleCloseReader}
              onSettingsChange={updateSettings}
              onProgressUpdate={updateProgress}
            />
          );
        }
        
        return (
          <>
            <Navigation
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSearchClear={clearSearch}
              isSearching={isSearching}
              totalBooks={library.books.length}
            />
            
            <main className="app__main">
              <BookGrid
                books={filteredBooks}
                loading={library.loading}
                error={library.error}
                onBookClick={handleBookClick}
                emptyMessage={
                  isSearching 
                    ? `No books found for "${searchQuery}"`
                    : 'No books available in the catalog'
                }
              />
            </main>
            
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
          </>
        );
      })()}
    </div>
  );
}

export default App;
