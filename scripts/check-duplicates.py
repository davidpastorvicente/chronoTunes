#!/usr/bin/env python3
"""
Check for duplicate songs in ChronoTunes database

Checks for:
- Duplicate YouTube IDs (same youtubeId in multiple songs)
- Duplicate titles (case-insensitive)

When duplicate YouTube IDs are found, automatically re-fetches correct IDs.

Usage:
    python3 scripts/check-duplicates.py
    python3 scripts/check-duplicates.py --fix  # Auto-update files with correct IDs
"""

import json
import sys
from collections import defaultdict

from ytmusicapi import YTMusic

# Import common utilities
from common import fetch_youtube_id


def load_songs_from_file(filename):
    """Load all songs from a JSON file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            songs = json.load(f)

        # Add filename to each song for tracking
        for song in songs:
            song['file'] = filename

        return songs

    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {filename}: {e}")
        return []


def refetch_youtube_ids(duplicate_songs):
    """Re-fetch YouTube IDs for duplicate songs

    Args:
        duplicate_songs: List of songs with duplicate IDs

    Returns:
        List of tuples: (song, new_id)
    """
    print(f"      🔄 Re-fetching YouTube IDs for each song...")

    ytmusic = YTMusic()
    results = []

    for song in duplicate_songs:
        title = song['title']
        artist = song['artist']

        print(f"         🔍 '{title}' by {artist}")

        new_id = fetch_youtube_id(ytmusic, title, artist)

        if new_id:
            old_id = song['youtubeId']
            if new_id != old_id:
                print(f"            ✅ Found: {new_id} (was: {old_id})")
                results.append((song, new_id))
            else:
                print(f"            ⚠️  Same ID: {new_id}")
        else:
            print(f"            ❌ Not found")

    return results


def check_duplicates(songs):
    """Check for duplicate YouTube IDs and titles"""
    youtube_map = defaultdict(list)
    title_map = defaultdict(list)

    for song in songs:
        youtube_map[song['youtubeId']].append(song)
        title_map[song['title'].lower()].append(song)

    youtube_dupes = {k: v for k, v in youtube_map.items() if len(v) > 1}
    title_dupes = {k: v for k, v in title_map.items() if len(v) > 1}

    return youtube_dupes, title_dupes


def print_duplicates_and_refetch(youtube_dupes, title_dupes):
    """Print duplicate report and re-fetch correct YouTube IDs"""
    has_duplicates = False
    all_fixes = []

    # YouTube ID duplicates
    if youtube_dupes:
        has_duplicates = True
        print("🔴 DUPLICATE YOUTUBE IDs FOUND:\n")
        for youtube_id, songs in youtube_dupes.items():
            print(f"  YouTube ID: {youtube_id}")
            for song in songs:
                file_short = song['file'].replace('src/data/', '')
                print(f"    - '{song['title']}' by {song['artist']} ({song['year']}) [{file_short}]")

            # Re-fetch correct IDs
            print()
            fixes = refetch_youtube_ids(songs)
            all_fixes.extend(fixes)
            print()

    # Title duplicates (no re-fetch needed, just informational)
    if title_dupes:
        has_duplicates = True
        print("🔴 DUPLICATE TITLES FOUND (case-insensitive):\n")
        for title_lower, songs in title_dupes.items():
            print(f"  Title: '{songs[0]['title']}'")
            for song in songs:
                file_short = song['file'].replace('src/data/', '')
                print(f"    - by {song['artist']} ({song['year']}) [YouTube: {song['youtubeId']}] [{file_short}]")
            print()

    return has_duplicates, all_fixes


def apply_fixes(fixes):
    """Apply fixes to the data files"""
    if not fixes:
        return

    print("\n🔧 APPLYING FIXES...\n")

    # Group fixes by file
    fixes_by_file = defaultdict(list)
    for song, new_id in fixes:
        fixes_by_file[song['file']].append((song, new_id))

    # Apply fixes to each file
    for filename, file_fixes in fixes_by_file.items():
        print(f"📝 Updating {filename}...")

        try:
            with open(filename, 'r', encoding='utf-8') as f:
                songs = json.load(f)

            for fix_song, new_id in file_fixes:
                old_id = fix_song['youtubeId']

                updated = False
                for song in songs:
                    # Match by title, artist, and year
                    if (song['title'] == fix_song['title'] and
                        song['artist'] == fix_song['artist'] and
                        song['year'] == fix_song['year']):
                        song['youtubeId'] = new_id
                        print(f"   ✅ '{song['title']}' (youtubeId): {old_id} → {new_id}")
                        updated = True
                        break

                if not updated:
                    print(f"   ⚠️  Could not find '{fix_song['title']}' in {filename}")

            # Write back (sorted by year)
            songs.sort(key=lambda x: x.get('year', 0))
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(songs, f, indent=2, ensure_ascii=False)
                f.write('\n')

            print()

        except Exception as e:
            print(f"   ❌ Error updating file: {e}\n")


def main():
    # Check for --fix flag
    auto_fix = '--fix' in sys.argv

    print("🔍 CHRONOTUNES DUPLICATE CHECKER")
    if auto_fix:
        print("   (Auto-fix mode: Will update files with correct IDs)")
    print()

    # Load songs
    all_songs = load_songs_from_file('src/data/songs.json')
    english_songs = [s for s in all_songs if s.get('language') == 'en']
    spanish_songs = [s for s in all_songs if s.get('language') == 'es']

    print(f"📊 Loaded {len(english_songs)} English songs")
    print(f"📊 Loaded {len(spanish_songs)} Spanish songs")
    print(f"📊 Total: {len(english_songs) + len(spanish_songs)} songs\n")

    all_songs = english_songs + spanish_songs

    if not all_songs:
        print("❌ No songs loaded!")
        sys.exit(1)

    # Check for duplicates
    youtube_dupes, title_dupes = check_duplicates(all_songs)

    print("=" * 60)
    print()

    has_duplicates, fixes = print_duplicates_and_refetch(youtube_dupes, title_dupes)

    if not has_duplicates:
        print("✅ NO DUPLICATES FOUND!")
        print("   All YouTube IDs and titles are unique.\n")
    else:
        print("=" * 60)
        print()
        print("💡 SUMMARY:")
        if youtube_dupes:
            print(f"   - {len(youtube_dupes)} duplicate YouTube ID(s)")
        if title_dupes:
            print(f"   - {len(title_dupes)} duplicate title(s)")
        print()

        # Apply fixes if requested
        if auto_fix and fixes:
            apply_fixes(fixes)
            print("✅ Files updated! Run script again to verify fixes.\n")
        elif fixes:
            print("💡 TIP: Run with --fix flag to automatically update files:")
            print("   python3 scripts/check-duplicates.py --fix\n")


if __name__ == '__main__':
    main()
