import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Book } from '../../types/book';
import type { ReaderSettings, TableOfContentsItem } from '../../types/reader';
import { epubService } from '../../services/epubService';
import { storageService } from '../../services/storageService';
import './Reader.css';

interface ReaderProps {
  book: Book;
  settings: ReaderSettings;
  tableOfContents: TableOfContentsItem[];
  onClose: () => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  onProgressUpdate: (location: string, progress: number) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  book,
  settings,
  tableOfContents,
  onClose,
  onSettingsChange,
  onProgressUpdate,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check screen size and determine spread mode
  useEffect(() => {
    const checkScreenSize = () => {
      // Consider screens wider than 1024px as wide enough for two-page spread
      const isWide = window.innerWidth >= 1024;
      setIsWideScreen(isWide);
    };

    // Check initial size
    checkScreenSize();

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Determine if we should use spread mode
  const shouldUseSpread = () => {
    switch (settings.spreadMode) {
      case 'single':
        return false;
      case 'double':
        // Only use double mode if screen is wide enough
        return isWideScreen;
      case 'auto':
      default:
        return isWideScreen;
    }
  };

  // Initialize the reader using EPUBService
  useEffect(() => {
    let mounted = true;

    const initReader = async () => {
      if (!viewerRef.current || !mounted) return;

      try {
        setIsLoading(true);
        setError(null);

        console.log('📖 Reader: Starting initialization...');

        // Use EPUBService to load the book properly (handles CORS proxy)
        console.log('📖 Reader: Loading book through EPUBService...');
        const epubBook = await epubService.loadBook(book);

        if (!mounted) return;

        bookRef.current = epubBook;
        console.log('📖 Reader: Book loaded successfully');

        // Wait for book to be ready
        await epubBook.ready;
        console.log('📖 Reader: Book is ready');

        if (!mounted || !viewerRef.current) return;

        // Create rendition with spread settings based on user preference and screen size
        const useSpread = shouldUseSpread();
        const rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: useSpread ? 'auto' : 'none',
          flow: 'paginated'
        });

        renditionRef.current = rendition;
        console.log('📖 Reader: Rendition created');

        // Apply basic styling
        rendition.themes.default({
          'body': {
            'margin': '20px !important',
            'padding': '0 !important'
          }
        });

        // Apply current settings
        applySettings(rendition, settings);

        // Check for saved reading position
        const savedProgress = storageService.getBookProgress(book.id);

        // Display the book - either at saved location or from beginning
        if (savedProgress && savedProgress.location) {
          console.log('📖 Reader: Restoring saved reading position:', Math.round(savedProgress.progress * 100) + '%');
          await rendition.display(savedProgress.location);
          // Set the saved progress immediately
          setProgress(savedProgress.progress);
        } else {
          console.log('📖 Reader: Starting from beginning');
          await rendition.display();
        }

        console.log('📖 Reader: Book displayed');

        // Set up navigation event listeners
        setupNavigation(rendition, epubBook);

        // Trigger initial progress calculation after a short delay to ensure rendition is ready
        setTimeout(() => {
          if (rendition.location && rendition.location.start) {
            updateProgress(rendition.location.start.cfi, epubBook);
          }
        }, 100);

        // Generate locations for progress tracking with smaller chunks for better accuracy
        epubBook.locations.generate(600).then(() => {
          console.log('📖 Reader: Locations generated, total:', epubBook.locations.total);
          // Update progress after locations are generated
          if (rendition.location) {
            updateProgress(rendition.location.start.cfi, epubBook);
          }
        }).catch((err: any) => {
          console.warn('Could not generate locations:', err);
        });

        if (mounted) {
          setIsLoading(false);
        }

      } catch (err: any) {
        console.error('❌ Reader: Error initializing:', err);
        if (mounted) {
          setError(`Failed to load book: ${err?.message || 'Unknown error'}`);
          setIsLoading(false);
        }
      }
    };

    initReader();

    return () => {
      mounted = false;
      // Cleanup
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [book.id, isWideScreen, settings.spreadMode]); // Re-initialize when screen size or spread mode changes

  // Apply settings to rendition
  const applySettings = useCallback((rendition: any, settings: ReaderSettings) => {
    if (!rendition) return;

    try {
      // Apply theme
      if (settings.theme === 'dark') {
        rendition.themes.override('color', '#ffffff');
        rendition.themes.override('background', '#1a1a1a');
      } else {
        rendition.themes.override('color', '#000000');
        rendition.themes.override('background', '#ffffff');
      }

      // Apply font settings
      rendition.themes.fontSize(`${settings.fontSize}px`);
      rendition.themes.override('font-family', settings.fontFamily);
      rendition.themes.override('line-height', settings.lineHeight.toString());
    } catch (error) {
      console.warn('Error applying settings:', error);
    }
  }, []);

  // Calculate progress from CFI
  const updateProgress = useCallback((cfi: string, epubBook: any) => {
    try {
      let progressPercent = 0;

      if (epubBook.locations && epubBook.locations.total > 0) {
        // Method 1: Use percentageFromCfi if available (most reliable)
        if (epubBook.locations.percentageFromCfi) {
          progressPercent = epubBook.locations.percentageFromCfi(cfi);
        } 
        // Method 2: Use locationFromCfi if available
        else if (epubBook.locations.locationFromCfi) {
          const currentLocation = epubBook.locations.locationFromCfi(cfi);
          if (currentLocation >= 0) {
            progressPercent = currentLocation / epubBook.locations.total;
          }
        }
        // Method 3: Calculate based on CFI position in locations array
        else if (epubBook.locations.length > 0) {
          // Find the closest location to our CFI
          let closestIndex = 0;
          for (let i = 0; i < epubBook.locations.length; i++) {
            if (epubBook.locations[i] <= cfi) {
              closestIndex = i;
            } else {
              break;
            }
          }
          progressPercent = closestIndex / epubBook.locations.length;
        }
      }

      // Fallback: calculate based on spine position if locations aren't available
      if (progressPercent === 0) {
        try {
          const spineItem = epubBook.spine.get(cfi);
          if (spineItem && epubBook.spine.length > 0) {
            const spineIndex = epubBook.spine.spineItems.findIndex((item: any) => item.href === spineItem.href);
            if (spineIndex >= 0) {
              progressPercent = spineIndex / epubBook.spine.length;
            }
          }
        } catch (spineError) {
          console.warn('Error calculating spine-based progress:', spineError);
        }
      }

      // Ensure progress is between 0 and 1
      progressPercent = Math.max(0, Math.min(1, progressPercent));
      
      console.log('📊 Reader: Progress calculated:', Math.round(progressPercent * 100) + '%', 
                  'Method:', epubBook.locations?.total ? 'locations' : 'spine');
      setProgress(progressPercent);
      onProgressUpdate(cfi, progressPercent);
    } catch (error) {
      console.warn('Error calculating progress:', error);
    }
  }, [onProgressUpdate]);

  // Set up navigation and event listeners
  const setupNavigation = useCallback((rendition: any, epubBook: any) => {
    if (!rendition || !epubBook) return;

    try {
      // Handle location changes for progress tracking
      rendition.on('relocated', (location: any) => {
        try {
          const cfi = location.start.cfi;
          updateProgress(cfi, epubBook);
        } catch (error) {
          console.warn('Error handling location change:', error);
        }
      });

      // Handle keyboard navigation
      rendition.on('keyup', (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          goToPrevPage();
        } else if (event.key === 'ArrowRight') {
          goToNextPage();
        }
      });

      console.log('📖 Reader: Navigation setup complete');
    } catch (error) {
      console.error('Error setting up navigation:', error);
    }
  }, [updateProgress]);

  // Navigation functions
  const goToNextPage = useCallback(() => {
    if (!renditionRef.current) {
      console.warn('📖 Reader: No rendition available for next page');
      return;
    }

    try {
      console.log('📖 Reader: Going to next page...');
      renditionRef.current.next().then(() => {
        console.log('📖 Reader: Successfully moved to next page');
      }).catch((error: any) => {
        console.error('❌ Reader: Error going to next page:', error);
      });
    } catch (error) {
      console.error('❌ Reader: Exception in goToNextPage:', error);
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    if (!renditionRef.current) {
      console.warn('📖 Reader: No rendition available for previous page');
      return;
    }

    try {
      console.log('📖 Reader: Going to previous page...');
      renditionRef.current.prev().then(() => {
        console.log('📖 Reader: Successfully moved to previous page');
      }).catch((error: any) => {
        console.error('❌ Reader: Error going to previous page:', error);
      });
    } catch (error) {
      console.error('❌ Reader: Exception in goToPrevPage:', error);
    }
  }, []);

  const goToChapter = useCallback((href: string) => {
    if (!renditionRef.current) return;

    try {
      renditionRef.current.display(href);
      setShowTOC(false);
    } catch (error) {
      console.error('Error navigating to chapter:', error);
    }
  }, []);

  // Add document-level keyboard navigation for better reliability
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when the reader is active and no input is focused
      if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Spacebar
          event.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          event.preventDefault();
          // Go to beginning of book
          if (renditionRef.current && bookRef.current) {
            renditionRef.current.display(bookRef.current.spine.first().href);
          }
          break;
        case 'End':
          event.preventDefault();
          // Go to end of book
          if (renditionRef.current && bookRef.current) {
            renditionRef.current.display(bookRef.current.spine.last().href);
          }
          break;
        case 'Escape':
          event.preventDefault();
          // Close settings/TOC panels or close reader
          if (showSettings) {
            setShowSettings(false);
          } else if (showTOC) {
            setShowTOC(false);
          } else {
            onClose();
          }
          break;
        case 't':
        case 'T':
          // Toggle table of contents
          if (!showSettings) {
            event.preventDefault();
            setShowTOC(!showTOC);
          }
          break;
        case 's':
        case 'S':
          // Toggle settings
          if (!showTOC) {
            event.preventDefault();
            setShowSettings(!showSettings);
          }
          break;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPrevPage, goToNextPage, showSettings, showTOC, onClose]);

  // Update settings when they change
  useEffect(() => {
    if (renditionRef.current) {
      applySettings(renditionRef.current, settings);
    }
  }, [settings, applySettings]);

  // Settings handlers
  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, settings.fontSize + delta));
    onSettingsChange({ fontSize: newSize });
  };

  const handleThemeToggle = () => {
    onSettingsChange({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  if (error) {
    return (
      <div className="reader reader--error">
        <div className="reader__error">
          <h3>Error Loading Book</h3>
          <p>{error}</p>
          <button onClick={onClose} className="reader__close-button">
            Close Reader
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`reader ${settings.theme === 'dark' ? 'reader--dark' : ''} ${shouldUseSpread() ? 'reader--spread' : ''}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="reader__loading-overlay">
          <div className="reader__loading">
            <div className="reader__spinner"></div>
            <p>Loading book...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="reader__header">
        <div className="reader__header-left">
          <button
            className="reader__button"
            onClick={onClose}
            aria-label="Close reader"
          >
            ←
          </button>
          <h1 className="reader__title">{book.title}</h1>
          {shouldUseSpread() && (
            <span className="reader__spread-indicator" title="Two-page spread mode">
              📖📖
            </span>
          )}
        </div>

        <div className="reader__header-right">
          <button
            className="reader__button"
            onClick={() => setShowTOC(!showTOC)}
            aria-label="Table of contents (T)"
            title="Table of contents (Press T)"
          >
            📑
          </button>
          <button
            className="reader__button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings (S)"
            title="Settings (Press S)"
          >
            ⚙️
          </button>
          <button
            className="reader__button"
            onClick={() => {
              const url = `${window.location.origin}/read/${encodeURIComponent(book.id)}`;
              navigator.clipboard.writeText(url).then(() => {
                // You could add a toast notification here
                console.log('📋 Reader: Book URL copied to clipboard:', url);
              }).catch(() => {
                // Fallback for older browsers
                console.log('📋 Reader: Share URL:', url);
              });
            }}
            aria-label="Share book"
            title="Copy link to this book"
          >
            🔗
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="reader__progress">
        <div
          className="reader__progress-bar"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="reader__content">
        {/* Settings panel */}
        {showSettings && (
          <div className="reader__settings">
            <h3>Reading Settings</h3>

            <div className="reader__setting">
              <label>Font Size</label>
              <div className="reader__font-controls">
                <button onClick={() => handleFontSizeChange(-2)}>A-</button>
                <span>{settings.fontSize}px</span>
                <button onClick={() => handleFontSizeChange(2)}>A+</button>
              </div>
            </div>

            <div className="reader__setting">
              <label>Theme</label>
              <button onClick={handleThemeToggle}>
                {settings.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>

            <div className="reader__setting">
              <label>Page Layout</label>
              <div className="reader__spread-controls">
                <button
                  className={settings.spreadMode === 'single' ? 'active' : ''}
                  onClick={() => onSettingsChange({ spreadMode: 'single' })}
                  title="Always show one page at a time"
                >
                  📄 Single
                </button>
                <button
                  className={settings.spreadMode === 'auto' ? 'active' : ''}
                  onClick={() => onSettingsChange({ spreadMode: 'auto' })}
                  title="Show two pages on wide screens, one page on narrow screens"
                >
                  🖥️ Auto
                </button>
                <button
                  className={settings.spreadMode === 'double' ? 'active' : ''}
                  onClick={() => onSettingsChange({ spreadMode: 'double' })}
                  title="Always show two pages side by side (if screen allows)"
                >
                  📖 Double
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table of contents */}
        {showTOC && (
          <div className="reader__toc">
            <h3>Table of Contents</h3>
            <ul className="reader__toc-list">
              {tableOfContents.map((item) => (
                <li key={item.id} className="reader__toc-item">
                  <button
                    className="reader__toc-link"
                    onClick={() => goToChapter(item.href)}
                  >
                    {item.label}
                  </button>
                  {item.subitems && (
                    <ul className="reader__toc-sublist">
                      {item.subitems.map((subitem) => (
                        <li key={subitem.id} className="reader__toc-subitem">
                          <button
                            className="reader__toc-link"
                            onClick={() => goToChapter(subitem.href)}
                          >
                            {subitem.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Book viewer with click navigation areas */}
        <div
          className="reader__viewer"
          ref={viewerRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            position: 'relative'
          }}
        >
          {/* Click areas for navigation */}
          <div
            className="reader__nav-area reader__nav-area--left"
            onClick={goToPrevPage}
            aria-label="Previous page"
            title="Previous page (← or Page Up)"
          />
          <div
            className="reader__nav-area reader__nav-area--right"
            onClick={goToNextPage}
            aria-label="Next page"
            title="Next page (→, Page Down, or Space)"
          />
        </div>
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '12px',
          fontSize: '11px',
          borderRadius: '6px',
          zIndex: 1000,
          maxWidth: '250px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            Progress: {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};
