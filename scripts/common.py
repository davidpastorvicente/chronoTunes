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


# Album-name keywords that usually indicate a reissue/compilation rather than
# the original release, so we skip them when estimating the original year.
_REISSUE_KEYWORDS = [
    'remaster', 'deluxe', 'edition', 'anniversary', 'greatest', 'best of',
    'compilation', 'hits', 'live', 'version', 'collection', 'reissue',
]


def _artist_matches(requested_artist, result_artists):
    """True if a search result's artist plausibly matches the requested one."""
    if not requested_artist:
        return True
    names = ' '.join(
        a.get('name', '') for a in (result_artists or []) if isinstance(a, dict)
    ).lower()
    token = requested_artist.lower().split()[0] if requested_artist.split() else ''
    return token in names if token else True


def estimate_release_year(ytmusic, title, artist):
    """
    Estimate a song's original release year from YouTube Music.

    Searches several song matches, keeps only those by the requested artist on
    albums that are not obvious reissues/compilations, and returns the earliest
    album year found. YouTube's data is album-based, so this is a best effort:
    older songs often resolve to a reissue year. Verify results for old tracks.

    Returns:
        int: Estimated year, or None if nothing suitable was found
    """
    try:
        results = ytmusic.search(f"{title} {artist}", filter="songs", limit=5)
    except Exception as e:
        print(f"      ⚠️  YouTube search error: {e}")
        return None

    earliest = None
    for result in results or []:
        if not _artist_matches(artist, result.get('artists')):
            continue
        album = result.get('album') or {}
        album_name = album.get('name', '').lower()
        if any(keyword in album_name for keyword in _REISSUE_KEYWORDS):
            continue
        year = fetch_album_year(ytmusic, album.get('id'))
        if year and (earliest is None or year < earliest):
            earliest = year
    return earliest


def fetch_youtube_data(ytmusic, title, artist):
    """
    Fetch YouTube ID, title, artist, and estimated release year from YouTube Music.

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

            # Estimate the original release year across candidate albums
            year = estimate_release_year(ytmusic, youtube_title, youtube_artist)

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
