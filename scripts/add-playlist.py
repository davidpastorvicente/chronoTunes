#!/usr/bin/env python3
"""
Add YouTube Music Playlist to ChronoTunes Database

End-to-end script that:
1. Fetches playlist tracks from YouTube Music
2. Cleans titles (removes parentheses like "Official Video", "feat.", etc.)
3. Searches for official YouTube video IDs (ensures best match)
4. Gets title and artist from YouTube API response
5. Cleans YouTube title again (removes any remaining parentheses/brackets)
6. Gets Deezer IDs, album covers, and years using cleaned YouTube metadata
7. Optionally processes until N songs are successfully imported
8. Removes duplicates (checks against existing songs)
9. Formats songs correctly (including type and language fields)
10. Appends to src/data/songs.json (sorted by year)

Usage:
    python3 scripts/add-playlist.py PLAYLIST_ID [--language en|es] [--limit N]
    
Example:
    python3 scripts/add-playlist.py PLDEoYTx7cT4dC7dkTTYi1exK5iYVtBw0B
    python3 scripts/add-playlist.py PLDEoYTx7cT4dC7dkTTYi1exK5iYVtBw0B --limit 50
    python3 scripts/add-playlist.py PLDEoYTx7cT4dC7dkTTYi1exK5iYVtBw0B --language es --limit 30

Options:
    --limit N      Process until N songs are successfully imported
    --language     Target language: 'en' for English, 'es' for Spanish

Note: YouTube IDs are searched via ytmusicapi (not taken from playlist directly)
      to ensure we get the official/best version of each song.
      
      Titles are cleaned TWICE:
      1. Before searching YouTube (removes playlist cruft)
      2. After getting YouTube's response (removes any remaining parentheses)
      
      The final title and artist stored come from YouTube's API (cleaned),
      ensuring canonical and consistent metadata.
      
      With --limit, the script will keep processing songs from the playlist
      until it successfully imports N songs (skipping any that fail).
"""

import re
import sys
import time
import json

from ytmusicapi import YTMusic

# Import common utilities
from common import fetch_youtube_data, get_deezer_data_with_year, clean_artist_name


def extract_playlist_id(url_or_id):
    """Extract playlist ID from URL or return as-is if already an ID"""
    if 'list=' in url_or_id:
        # Extract from URL
        match = re.search(r'list=([^&]+)', url_or_id)
        return match.group(1) if match else url_or_id
    return url_or_id

def fetch_playlist_tracks(playlist_id):
    """Fetch all tracks from a YouTube Music playlist"""
    print(f"🎵 Fetching playlist: {playlist_id}\n")
    
    ytmusic = YTMusic()
    
    try:
        playlist = ytmusic.get_playlist(playlist_id)
        
        print(f"📀 Playlist: {playlist.get('title', 'Unknown')}")
        print(f"   Author: {playlist.get('author', {}).get('name', 'Unknown')}")
        print(f"   Tracks: {playlist.get('trackCount', 0)}\n")
        
        tracks = playlist.get('tracks', [])
        print(f"✅ Found {len(tracks)} tracks\n")
        
        return tracks
        
    except Exception as e:
        print(f"❌ Error fetching playlist: {e}")
        sys.exit(1)


def process_tracks(tracks, limit=None):
    """Process playlist tracks and get metadata
    
    Args:
        tracks: List of track dictionaries
        limit: If set, stop after successfully processing this many songs
    """
    total_tracks = len(tracks)
    limit_msg = f" (stopping at {limit} successful)" if limit else ""
    print(f"🔍 Processing up to {total_tracks} tracks{limit_msg}...\n")
    
    ytmusic = YTMusic()
    processed_songs = []
    failed = []
    
    for i, track in enumerate(tracks, 1):
        # Check if we've reached the limit
        if limit and len(processed_songs) >= limit:
            print(f"\n🎯 Reached limit of {limit} successful songs!")
            print(f"   Processed {i-1}/{total_tracks} tracks to get {limit} songs")
            break
        
        title = track.get('title', 'Unknown')
        artists = track.get('artists', [])
        artist = clean_artist_name(artists)
        
        # Clean title - remove everything in parentheses (Official Video, feat., etc.)
        clean_title = re.sub(r'\([^)]*\)', '', title).strip()
        # Also remove brackets
        clean_title = re.sub(r'\[[^]]*]', '', clean_title).strip()
        
        progress = f"[{len(processed_songs)}/{limit}]" if limit else f"{i:2d}"
        print(f"{progress} 🔍 {title} - {artist}")
        print(f"    Searching: {clean_title} - {artist}")
        
        # Search for YouTube ID (instead of using playlist's video ID)
        # This also gets the canonical title and artist from YouTube
        video_id, youtube_title, youtube_artist = fetch_youtube_data(ytmusic, clean_title, artist)
        
        if not video_id:
            print(f"    ❌ No YouTube video ID found")
            failed.append({'title': title, 'artist': artist, 'reason': 'No YouTube ID'})
            continue
        
        print(f"    YouTube says: {youtube_title} - {youtube_artist}")
        
        # Clean YouTube's title as well (sometimes it also has parentheses/brackets)
        clean_youtube_title = re.sub(r'\([^)]*\)', '', youtube_title).strip()
        clean_youtube_title = re.sub(r'\[[^]]*]', '', clean_youtube_title).strip()
        
        if clean_youtube_title != youtube_title:
            print(f"    Cleaned to: {clean_youtube_title}")
        
        # Get Deezer data using cleaned YouTube metadata
        deezer_data = get_deezer_data_with_year(clean_youtube_title, youtube_artist)
        
        if not deezer_data:
            print(f"    ⚠️  No Deezer data found - skipping")
            failed.append({'title': clean_youtube_title, 'artist': youtube_artist, 'reason': 'No Deezer data'})
            continue
        
        song = {
            'title': clean_youtube_title,  # Use cleaned YouTube title
            'artist': youtube_artist,  # Use YouTube's canonical artist
            'year': deezer_data['year'],
            'youtubeId': video_id,
            'deezerId': deezer_data['deezerId'],
            'type': 'song',
            'language': language
        }
        
        processed_songs.append(song)
        print(f"    ✅ Year: {deezer_data['year']} - DeezerID: {deezer_data['deezerId']} - YouTubeID: {video_id}")
        
        # Rate limiting
        time.sleep(0.3)
    
    print(f"\n✅ Successfully processed: {len(processed_songs)}")
    if failed:
        print(f"⚠️  Failed: {len(failed)}")
    
    return processed_songs, failed

def load_existing_songs(language='en'):
    """Load existing songs from songs.json and filter by language"""

    filename = "src/data/songs.json"
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            all_songs = json.load(f)
        
        # Filter songs by language
        songs = [s for s in all_songs if s.get('language') == language]
        
        # Extract existing song titles (lowercase for case-insensitive comparison)
        titles = set(song['title'].lower() for song in songs)
        
        return titles, all_songs, filename
        
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {filename}: {e}")
        sys.exit(1)

def filter_duplicates(songs, existing_titles):
    """Filter out songs that already exist in the database (case-insensitive)"""
    unique_songs = []
    duplicates = []
    
    for song in songs:
        title = song['title']
        # Clean title for comparison
        clean_title = title.split('(feat.')[0].split('(ft.')[0].strip()
        
        # Case-insensitive comparison
        if title.lower() in existing_titles or clean_title.lower() in existing_titles:
            duplicates.append(title)
        else:
            unique_songs.append(song)
    
    return unique_songs, duplicates

def append_songs_to_file(new_songs, existing_songs, filename):
    """Append songs to the JSON file and sort by year"""
    try:
        # Combine existing and new songs
        all_songs = existing_songs + new_songs
        
        # Sort by year (ascending)
        all_songs.sort(key=lambda x: x['year'])
        
        # Write back to file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(all_songs, f, indent=2, ensure_ascii=False)
        
        return True
    except (IOError, OSError) as e:
        print(f"❌ Error writing to file: {e}")
        return False

def print_summary(total_tracks, processed, failed, unique, duplicates, language):
    """Print processing summary"""
    print("\n" + "="*80)
    print("📊 PROCESSING SUMMARY")
    print("="*80)
    print(f"Total tracks in playlist: {total_tracks}")
    print(f"Successfully processed: {len(processed)}")
    print(f"Failed to process: {len(failed)}")
    print(f"Duplicates (already in DB): {len(duplicates)}")
    print(f"✅ New songs added: {len(unique)}")
    
    if duplicates:
        print(f"\n⚠️  Duplicate songs (not added):")
        for title in duplicates[:10]:
            print(f"   - {title}")
        if len(duplicates) > 10:
            print(f"   ... and {len(duplicates) - 10} more")
    
    if failed:
        print(f"\n❌ Failed songs (needs manual review):")
        for item in failed[:10]:
            print(f"   - {item.get('title', 'Unknown')}: {item.get('reason', 'Unknown')}")
        if len(failed) > 10:
            print(f"   ... and {len(failed) - 10} more")
    
    # Count songs in file
    filename = 'src/data/songs.json'
    with open(filename, 'r', encoding='utf-8') as f:
        songs_data = json.load(f)
    
    # Filter by language
    total_in_file = len([s for s in songs_data if s.get('language') == language])
    
    print(f"\n📈 Total {language} songs in {filename}: {total_in_file}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 add-playlist.py PLAYLIST_ID [--language en|es] [--limit N]")
        print("\nExample:")
        print("  python3 add-playlist.py PLDEoYTx7cT4dC7dkTTYi1exK5iYVtBw0B")
        print("  python3 add-playlist.py https://music.youtube.com/playlist?list=...")
        print("  python3 add-playlist.py PLAYLIST_ID --limit 50  # Import 50 successful songs")
        print("  python3 add-playlist.py PLAYLIST_ID --language es --limit 30")
        sys.exit(1)
    
    # Parse arguments
    playlist_input = sys.argv[1]
    language = 'en'  # default
    limit = None  # default: no limit
    
    if '--language' in sys.argv:
        lang_index = sys.argv.index('--language')
        if lang_index + 1 < len(sys.argv):
            language = sys.argv[lang_index + 1]
    
    if '--limit' in sys.argv:
        limit_index = sys.argv.index('--limit')
        if limit_index + 1 < len(sys.argv):
            try:
                limit = int(sys.argv[limit_index + 1])
            except ValueError:
                print(f"❌ Invalid limit value. Must be a number.")
                sys.exit(1)
    
    if language not in ['en', 'es']:
        print(f"❌ Invalid language: {language}. Use 'en' or 'es'")
        sys.exit(1)
    
    print("🎵 YOUTUBE PLAYLIST TO CHRONOTUNES CONVERTER\n")
    print(f"Language: {'English' if language == 'en' else 'Spanish'}")
    if limit:
        print(f"Limit: Process until {limit} successful songs imported")
    print()
    
    # Extract playlist ID
    playlist_id = extract_playlist_id(playlist_input)
    
    # Step 1: Fetch playlist tracks
    tracks = fetch_playlist_tracks(playlist_id)
    
    # Step 2: Process tracks (will stop at limit if specified)
    processed, failed = process_tracks(tracks, limit=limit)
    
    if not processed:
        print("\n❌ No songs were successfully processed. Exiting.")
        sys.exit(1)
    
    # Step 3: Load existing songs
    print("\n📂 Loading existing songs...")
    existing_titles, existing_songs, filename = load_existing_songs(language)
    print(f"   Found {len(existing_titles)} existing songs")
    
    # Step 4: Filter duplicates
    print("\n🔍 Filtering duplicates...")
    unique_songs, duplicates = filter_duplicates(processed, existing_titles)
    print(f"   {len(unique_songs)} unique new songs to add")
    print(f"   {len(duplicates)} duplicates found")
    
    if not unique_songs:
        print("\n⚠️  No new songs to add (all are duplicates)")
        print_summary(len(tracks), processed, failed, unique_songs, duplicates, language)
        sys.exit(0)
    
    # Step 5: Append to file
    print(f"\n📝 Adding {len(unique_songs)} songs to {filename}...")
    success = append_songs_to_file(unique_songs, existing_songs, filename)
    
    if success:
        print(f"✅ Successfully added songs to {filename}")
    else:
        print(f"❌ Failed to add songs to {filename}")
        sys.exit(1)
    
    # Step 6: Print summary
    print_summary(len(tracks), processed, failed, unique_songs, duplicates, language)
    
    print("\n" + "="*80)
    print("✅ COMPLETE!")
    print("="*80)
    print("\nNext steps:")
    print("1. Run 'npm run build' to verify")
    print("2. Test the game with new songs")
    print("3. Commit changes to git")
    print("\nNote: Preview URLs are fetched at runtime via fetchDeezerPreview()")

if __name__ == "__main__":
    main()
