// Import all media data
import englishSongs from './songs/english.json';
import spanishSongs from './songs/spanish.json';
import englishMovies from './movies/english.json';
import spanishMovies from './movies/spanish.json';

// Helper function to create media sets
function createMediaSets(englishItems, spanishItems, itemsKey) {
  const allItems = [...englishItems, ...spanishItems];
  
  return {
    everything: {
      name: 'Everything',
      [itemsKey]: allItems
    },
    english: {
      name: 'English',
      [itemsKey]: englishItems
    },
    spanish: {
      name: 'Spanish',
      [itemsKey]: spanishItems
    },
    new: {
      name: `New (2010+)`,
      [itemsKey]: allItems.filter(item => item.year >= 2010)
    }
  };
}

// Export song sets
export const songSets = createMediaSets(englishSongs, spanishSongs, 'songs');

// Export movie sets
export const movieSets = createMediaSets(englishMovies, spanishMovies, 'movies');
