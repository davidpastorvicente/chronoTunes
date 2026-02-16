#!/usr/bin/env python3
"""
Validate song titles against Deezer API
Compares titles in the database with titles from Deezer API using the deezerId

Usage:
    python3 scripts/check-titles.py
"""

import re
import requests
import json
import time
import unicodedata


def load_songs_from_file(filename):
    """Load all songs from a data file"""
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
        print(f"❌ Error parsing {filename}: {e}")
        return []



def normalize_title(title):
    """
    Normalize title for comparison
    - Remove accents (á → a, é → e, etc.)
    - Lowercase
    - Remove special characters (keep only alphanumeric and spaces)
    - Remove extra whitespace
    """
    # Remove accents by decomposing unicode characters and removing combining marks
    normalized = unicodedata.normalize('NFD', title)
    normalized = ''.join(char for char in normalized if unicodedata.category(char) != 'Mn')
    
    # Lowercase
    normalized = normalized.lower()
    
    # Remove special characters, keep only alphanumeric and spaces
    normalized = re.sub(r'[^a-z0-9\s]', '', normalized)
    
    # Remove extra whitespace
    normalized = ' '.join(normalized.split())
    
    return normalized


def fetch_deezer_title(deezer_id):
    """Fetch track title from Deezer API"""
    try:
        url = f"https://api.deezer.com/track/{deezer_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        return data.get('title', None)
        
    except Exception as e:
        print(f"      ⚠️  API error: {e}")
        return None


def check_song_titles():
    """Check all songs and validate titles against Deezer API"""
    
    print("🔍 CHRONOTUNES TITLE VALIDATOR\n")
    
    # Load songs from both files
    all_songs_data = load_songs_from_file('src/data/songs.json')
    english_songs = [s for s in all_songs_data if s.get('language') == 'en']
    spanish_songs = [s for s in all_songs_data if s.get('language') == 'es']
    
    all_songs = english_songs + spanish_songs
    
    print(f"📊 Loaded {len(english_songs)} English songs")
    print(f"📊 Loaded {len(spanish_songs)} Spanish songs")
    print(f"📊 Total: {len(all_songs)} songs\n")
    print("=" * 60)
    print()
    
    mismatches = []
    api_errors = []
    
    for i, song in enumerate(all_songs, 1):
        title = song['title']
        deezer_id = song['deezerId']
        
        # Progress indicator
        if i % 50 == 0:
            print(f"⏳ Checked {i}/{len(all_songs)} songs...")
        
        # Fetch title from Deezer
        deezer_title = fetch_deezer_title(deezer_id)
        
        if deezer_title is None:
            api_errors.append({
                'song': song,
                'reason': 'Failed to fetch from Deezer API'
            })
            continue
        
        # Normalize both titles
        normalized_db = normalize_title(title)
        normalized_deezer = normalize_title(deezer_title)
        
        # Compare
        if normalized_db not in normalized_deezer:
            mismatches.append({
                'song': song,
                'db_title': title,
                'deezer_title': deezer_title,
                'normalized_db': normalized_db,
                'normalized_deezer': normalized_deezer
            })
        
        # Rate limiting - don't hammer the API
        time.sleep(0.1)
    
    print(f"\n✅ Checked all {len(all_songs)} songs\n")
    print("=" * 60)
    
    # Report results
    if mismatches:
        print(f"\n⚠️  FOUND {len(mismatches)} TITLE MISMATCHES:\n")
        
        for mismatch in mismatches:
            song = mismatch['song']
            print(f"📍 {song['file']}")
            print(f"   Artist: {song['artist']}")
            print(f"   Database:  \"{mismatch['db_title']}\"")
            print(f"   Deezer:    \"{mismatch['deezer_title']}\"")
            print(f"   DeezerID: {song['deezerId']}")
            print()
    else:
        print("\n✅ ALL TITLES MATCH!")
        print("   All song titles in the database match Deezer API.\n")
    
    if api_errors:
        print(f"⚠️  {len(api_errors)} API ERRORS:\n")
        for error in api_errors:
            song = error['song']
            print(f"   {song['title']} - {song['artist']} (ID: {song['deezerId']})")
            print(f"   Reason: {error['reason']}\n")
    
    return len(mismatches)


if __name__ == "__main__":
    exit(0 if check_song_titles() == 0 else 1)
