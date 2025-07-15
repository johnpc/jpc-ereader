import { useState, useEffect, useCallback } from 'react';
import type { ReaderSettings, TableOfContentsItem } from '../types/reader';
import { storageService } from '../services/storageService';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  theme: 'dark',
  fontFamily: 'serif',
  lineHeight: 1.6,
  margin: 20,
  spreadMode: 'auto',
};

export const useReader = () => {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);

  // Load saved settings on mount
  useEffect(() => {
    try {
      console.log('📚 useReader: Loading saved settings from localStorage...');
      
      // Load global settings (now always returns settings, with dark mode as default)
      const savedSettings = storageService.getGlobalSettings();
      
      console.log('⚙️ useReader: Loaded settings:', savedSettings);
      
      setSettings(savedSettings);
    } catch (error) {
      console.error('❌ useReader: Error loading reader settings from localStorage:', error);
    }
  }, []);

  // Update reader settings
  const updateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    
    console.log('⚙️ useReader: Updating settings:', newSettings);
    
    // Save as global settings
    storageService.saveGlobalSettings(updatedSettings);
    
    setSettings(updatedSettings);
  }, [settings]);

  // Save reading progress
  const saveProgress = useCallback((bookId: string, location: string, progress: number) => {
    console.log('📊 useReader: Saving progress for book:', bookId, Math.round(progress * 100) + '%');
    
    // Save progress to storage service
    storageService.saveBookProgress(bookId, location, progress);
  }, []);

  return {
    settings,
    tableOfContents,
    updateSettings,
    saveProgress,
    setTableOfContents, // For the Reader component to update TOC
  };
};
