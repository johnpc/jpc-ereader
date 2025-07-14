import type { Book } from '../types/book';

/**
 * Calculate the Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is exact match)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

/**
 * Check if a string contains all words from the query (order doesn't matter)
 */
function containsAllWords(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  return queryWords.every(word => textLower.includes(word));
}

/**
 * Calculate a comprehensive search score for a book
 */
function calculateBookScore(book: Book, query: string): number {
  const queryLower = query.toLowerCase();
  const titleLower = book.title.toLowerCase();
  const authorLower = book.author.toLowerCase();
  const descriptionLower = book.description?.toLowerCase() || '';
  
  let score = 0;
  
  // Exact matches get highest priority
  if (titleLower === queryLower || authorLower === queryLower) {
    score += 100;
  }
  
  // Starts with query gets high priority
  if (titleLower.startsWith(queryLower) || authorLower.startsWith(queryLower)) {
    score += 80;
  }
  
  // Contains exact query gets good priority
  if (titleLower.includes(queryLower)) {
    score += 60;
  }
  if (authorLower.includes(queryLower)) {
    score += 50;
  }
  if (descriptionLower.includes(queryLower)) {
    score += 20;
  }
  
  // Contains all words from query
  if (containsAllWords(book.title, query)) {
    score += 40;
  }
  if (containsAllWords(book.author, query)) {
    score += 30;
  }
  if (containsAllWords(descriptionLower, query)) {
    score += 10;
  }
  
  // Fuzzy matching for typos - check individual words
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);
  const titleWords = book.title.toLowerCase().split(/\s+/);
  const authorWords = book.author.toLowerCase().split(/\s+/);
  
  for (const queryWord of queryWords) {
    // Check title words for fuzzy matches
    for (const titleWord of titleWords) {
      const similarity = calculateSimilarity(titleWord, queryWord);
      if (similarity > 0.75) { // More lenient threshold for individual words
        score += similarity * 25;
      }
    }
    
    // Check author words for fuzzy matches
    for (const authorWord of authorWords) {
      const similarity = calculateSimilarity(authorWord, queryWord);
      if (similarity > 0.75) {
        score += similarity * 20;
      }
    }
  }
  
  // Overall fuzzy matching for complete phrases
  const titleSimilarity = calculateSimilarity(titleLower, queryLower);
  const authorSimilarity = calculateSimilarity(authorLower, queryLower);
  
  if (titleSimilarity > 0.6) {
    score += titleSimilarity * 15;
  }
  if (authorSimilarity > 0.6) {
    score += authorSimilarity * 12;
  }
  
  // Bonus for shorter titles (more likely to be relevant)
  if (score > 0 && book.title.length < 50) {
    score += 5;
  }
  
  return score;
}

/**
 * Search and filter books using fuzzy matching
 * Returns books sorted by relevance score
 */
export function fuzzySearchBooks(books: Book[], query: string): Book[] {
  if (!query.trim()) {
    return books;
  }
  
  const scoredBooks = books
    .map(book => ({
      book,
      score: calculateBookScore(book, query.trim())
    }))
    .filter(item => item.score > 0) // Only include books with some relevance
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .map(item => item.book);
  
  return scoredBooks;
}

/**
 * Simple search that only looks for exact substring matches
 * Faster alternative for simple searches
 */
export function simpleSearchBooks(books: Book[], query: string): Book[] {
  if (!query.trim()) {
    return books;
  }
  
  const queryLower = query.toLowerCase().trim();
  
  return books.filter(book => 
    book.title.toLowerCase().includes(queryLower) ||
    book.author.toLowerCase().includes(queryLower) ||
    book.description?.toLowerCase().includes(queryLower)
  );
}

/**
 * Get search suggestions based on partial input
 */
export function getSearchSuggestions(books: Book[], query: string, maxSuggestions = 5): string[] {
  if (!query.trim() || query.length < 2) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  const suggestions = new Set<string>();
  
  books.forEach(book => {
    // Add title suggestions
    if (book.title.toLowerCase().includes(queryLower)) {
      suggestions.add(book.title);
    }
    
    // Add author suggestions
    if (book.author.toLowerCase().includes(queryLower)) {
      suggestions.add(book.author);
    }
    
    // Add word-based suggestions
    const titleWords = book.title.split(/\s+/);
    const authorWords = book.author.split(/\s+/);
    
    [...titleWords, ...authorWords].forEach(word => {
      if (word.toLowerCase().startsWith(queryLower)) {
        suggestions.add(word);
      }
    });
  });
  
  return Array.from(suggestions)
    .slice(0, maxSuggestions)
    .sort((a, b) => a.length - b.length); // Shorter suggestions first
}
