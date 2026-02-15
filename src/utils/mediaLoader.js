import { songSets, movieSets } from '../data/media';

/**
 * Load media items based on category and content set
 * @param {string} category - 'songs', 'movies', or 'all'
 * @param {string} contentSet - 'everything', 'english', 'spanish', or 'new'
 * @returns {Array} Array of media items
 */
export function loadMediaByCategory(category, contentSet) {
  let selectedMedia;
  
  if (category === 'songs') {
    selectedMedia = songSets[contentSet]?.songs || songSets.everything.songs;
  } else if (category === 'movies') {
    selectedMedia = movieSets[contentSet]?.movies || movieSets.everything.movies;
  } else if (category === 'all') {
    // Mix both songs and movies with balanced representation
    const songs = songSets[contentSet]?.songs || songSets.everything.songs;
    const movies = movieSets[contentSet]?.movies || movieSets.everything.movies;
    
    // Balance by duplicating the smaller set to match the larger one
    const maxLength = Math.max(songs.length, movies.length);
    const balancedSongs = [];
    const balancedMovies = [];
    
    // Repeat items to reach maxLength
    for (let i = 0; i < maxLength; i++) {
      balancedSongs.push(songs[i % songs.length]);
      balancedMovies.push(movies[i % movies.length]);
    }
    
    // Interleave songs and movies for better distribution
    selectedMedia = [];
    for (let i = 0; i < maxLength; i++) {
      selectedMedia.push(balancedSongs[i]);
      selectedMedia.push(balancedMovies[i]);
    }
  }
  
  return selectedMedia;
}
