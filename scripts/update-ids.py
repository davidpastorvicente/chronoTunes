#!/usr/bin/env python3
"""
Script to automatically fetch missing YouTube IDs for songs in the database.
Uses ytmusicapi for YouTube Music.

Usage:
    python3 scripts/update-ids.py           # Only fetch missing IDs
    python3 scripts/update-ids.py --force    # Re-fetch all IDs, even if present
"""

import json
import sys
import time

from ytmusicapi import YTMusic

# Import common utilities
from common import fetch_youtube_id


def extract_songs_from_file(filepath):
    """Extract all songs from the data file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        songs = json.load(f)

    return songs


def update_songs_file(filepath, youtube_updates):
    """Update the data file with new YouTube IDs."""
    with open(filepath, 'r', encoding='utf-8') as f:
        songs = json.load(f)

    # Update YouTube IDs
    for song_key, youtube_id in youtube_updates.items():
        title, artist = song_key

        # Find the song and update it
        for song in songs:
            if song['title'] == title and song['artist'] == artist:
                song['youtubeId'] = youtube_id
                break

    # Sort by year and write back
    songs.sort(key=lambda x: x.get('year', 0))
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)
        f.write('\n')


def main():
    # Check for --force flag
    force_mode = '--force' in sys.argv

    filepath = 'src/data/songs.json'

    print("=" * 60)
    print("YouTube ID Updater for ChronoTunes Game")
    if force_mode:
        print("🔄 FORCE MODE: Re-fetching all IDs")
    print("=" * 60)
    print()

    print(f"Processing: {filepath}")
    print('=' * 60)

    # Extract songs from file
    print("📖 Reading file...")
    songs = extract_songs_from_file(filepath)
    print(f"✓ Found {len(songs)} songs in file\n")

    # Find songs to process
    if force_mode:
        missing_youtube = songs
        print("🔄 Force mode: Processing all songs\n")
    else:
        missing_youtube = [s for s in songs if not s.get('youtubeId') or s['youtubeId'].strip() == '']

        if not missing_youtube:
            print("✅ All songs already have YouTube IDs!")
            print("   (Use --force to re-fetch all IDs)\n")
            return

        print(f"🔍 Found {len(missing_youtube)} songs without YouTube IDs\n")

    youtube_updates = {}
    youtube_failed = []

    # Fetch YouTube IDs
    print("🎵 Initializing YouTube Music API...")
    ytmusic = YTMusic()
    print("✓ YouTube API ready\n")

    mode_msg = "YouTube IDs" if not force_mode else "all YouTube IDs"
    print(f"🔎 Fetching {mode_msg}...\n")
    for i, song in enumerate(missing_youtube, 1):
        current_id = song.get('youtubeId', 'none')
        print(f"[{i}/{len(missing_youtube)}] {song['title']} - {song['artist']}")
        if force_mode and current_id and current_id.strip():
            print(f"    Current: {current_id}")

        youtube_id = fetch_youtube_id(ytmusic, song['title'], song['artist'])

        if youtube_id:
            youtube_updates[(song['title'], song['artist'])] = youtube_id
            if force_mode and current_id and current_id.strip() and youtube_id != current_id:
                print(f"  ✓ YouTube: {youtube_id} (replaced)")
            else:
                print(f"  ✓ YouTube: {youtube_id}")
        else:
            youtube_failed.append(song)
            print(f"  ✗ YouTube: Not found")

        # Small delay to avoid rate limiting
        if i < len(missing_youtube):
            time.sleep(0.3)

    print()
    print("=" * 60)
    print("RESULTS:")
    print(f"  YouTube IDs - Successfully fetched: {len(youtube_updates)}, Failed: {len(youtube_failed)}")
    print("=" * 60)
    print()

    # Update the file
    if youtube_updates:
        print(f"💾 Updating {filepath}...")
        update_songs_file(filepath, youtube_updates)
        print(f"✓ Added/updated {len(youtube_updates)} YouTube IDs in {filepath}")

    # Show failed songs
    if youtube_failed:
        print("\n⚠️  Failed to find YouTube IDs for:")
        for song in youtube_failed:
            print(f"  - {song['title']} by {song['artist']} ({song['year']})")
        print("\nYou may need to manually add these entries.")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
