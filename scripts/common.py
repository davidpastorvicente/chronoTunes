"""
Common utilities for ChronoTunes scripts

Shared functions for fetching song metadata from YouTube Music (via ytmusicapi).
Runtime playback and all metadata now come from YouTube only.

Usage:
    from common import fetch_youtube_id, fetch_youtube_data, fetch_album_year
"""


def fetch_youtube_id(ytmusic, title, artist):
    """
    Fetch YouTube ID by searching YouTube Music

    Args:
        ytmusic: YTMusic instance
        title: Song title
        artist: Artist name

    Returns:
        str: Video ID if found, None otherwise
    """
    try:
        search_query = f"{title} {artist}"
        search_results = ytmusic.search(search_query, filter="songs", limit=1)

        if search_results and len(search_results) > 0:
            result = search_results[0]
            video_id = result.get('videoId')
            return video_id
        return None
    except Exception as e:
        print(f"      ⚠️  YouTube search error: {e}")
        return None


def fetch_album_year(ytmusic, album_browse_id):
    """
    Fetch the release year for an album from YouTube Music.

    Args:
        ytmusic: YTMusic instance
        album_browse_id: Album browseId (e.g. "MPRE...") from a search result

    Returns:
        int: Release year if found, None otherwise
    """
    if not album_browse_id:
        return None
    try:
        album = ytmusic.get_album(album_browse_id)
        year = album.get('year')
        if year:
            year = int(str(year)[:4])
            if 1900 <= year <= 2100:
                return year
        return None
    except Exception:
        return None


def fetch_youtube_data(ytmusic, title, artist):
    """
    Fetch YouTube ID, title, artist, and release year by searching YouTube Music.
    Returns full metadata from YouTube for more accurate data.

    Args:
        ytmusic: YTMusic instance
        title: Song title
        artist: Artist name

    Returns:
        tuple: (video_id, youtube_title, youtube_artist, year) or (None, None, None, None)
    """
    try:
        search_query = f"{title} {artist}"
        search_results = ytmusic.search(search_query, filter="songs", limit=1)

        if search_results and len(search_results) > 0:
            result = search_results[0]
            video_id = result.get('videoId')
            youtube_title = result.get('title', title)  # Fallback to original

            # Get artist from YouTube (might be list or string)
            youtube_artists = result.get('artists', [])
            if isinstance(youtube_artists, list) and len(youtube_artists) > 0:
                youtube_artist = youtube_artists[0].get('name', artist)
            else:
                youtube_artist = artist  # Fallback to original

            # Resolve release year from the song's album
            album_browse_id = (result.get('album') or {}).get('id')
            year = fetch_album_year(ytmusic, album_browse_id)

            return video_id, youtube_title, youtube_artist, year
        return None, None, None, None
    except Exception as e:
        print(f"      ⚠️  YouTube search error: {e}")
        return None, None, None, None


def clean_artist_name(artists):
    """
    Clean artist name from YouTube Music API response

    Args:
        artists: List of artist dicts or string

    Returns:
        str: Cleaned artist name
    """
    if isinstance(artists, list) and len(artists) > 0:
        if isinstance(artists[0], dict):
            return artists[0].get('name', 'Unknown Artist')
        return str(artists[0])
    elif isinstance(artists, str):
        return artists
    return 'Unknown Artist'
