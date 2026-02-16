// Import all media data
import songs from '../data/songs.json';
import movies from '../data/movies.json';
import shows from '../data/shows.json';

// Helper function to create media sets from unified data
function createMediaSets(allItems) {
  const englishItems = allItems.filter(item => item.language === 'en');
  const spanishItems = allItems.filter(item => item.language === 'es');
  
  return {
    everything: allItems,
    english: englishItems,
    spanish: spanishItems,
    new: allItems.filter(item => item.year >= 2010)
  };
}

// Create media sets
export const songSets = createMediaSets(songs);
export const movieSets = createMediaSets(movies);
export const showSets = createMediaSets(shows);

/**
 * Load media items based on category and content set
 * @param {string} category - 'songs', 'movies', 'shows', or 'all'
 * @param {string} contentSet - 'everything', 'english', 'spanish', or 'new'
 * @returns {Array} Array of media items
 */
export function loadMediaByCategory(category, contentSet) {
  let selectedMedia;
  
  if (category === 'songs') {
    selectedMedia = songSets[contentSet];
  } else if (category === 'movies') {
    selectedMedia = movieSets[contentSet];
  } else if (category === 'shows') {
    selectedMedia = showSets[contentSet];
  } else if (category === 'all') {
    // Mix songs, movies, and shows with balanced representation
    const songs = songSets[contentSet];
    const movies = movieSets[contentSet];
    const shows = showSets[contentSet];
    
    // Balance by duplicating smaller sets to match the largest one
    const maxLength = Math.max(songs.length, movies.length, shows.length);
    const balancedSongs = [];
    const balancedMovies = [];
    const balancedShows = [];
    
    // Repeat items to reach maxLength
    for (let i = 0; i < maxLength; i++) {
      balancedSongs.push(songs[i % songs.length]);
      balancedMovies.push(movies[i % movies.length]);
      balancedShows.push(shows[i % shows.length]);
    }
    
    // Interleave songs, movies, and shows for better distribution
    selectedMedia = [];
    for (let i = 0; i < maxLength; i++) {
      selectedMedia.push(balancedSongs[i]);
      selectedMedia.push(balancedMovies[i]);
      selectedMedia.push(balancedShows[i]);
    }
  }
  
  return selectedMedia;
}
