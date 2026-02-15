#!/usr/bin/env python3
"""
Fetch movies and TV shows from TMDB API using discover endpoints.
Creates movie/show database with title, year, and backdrop image URLs.
Uses discover endpoints with certification_country, watch_region, and original_language filters.
Organized like songs: separate english.json and spanish.json files in src/data/movies/
"""
import os

import requests
import json
import sys
from pathlib import Path

# TMDB API Configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

def fetch_discover_movies(language="en-US", page=1, certification_country=None, watch_region=None, original_language=None, release_date_gte=None, release_date_lte=None):
    """Fetch movies from TMDB discover endpoint with filters."""
    url = f"{TMDB_BASE_URL}/discover/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "language": language,
        "page": page,
        "sort_by": "popularity.desc"
    }
    
    if certification_country:
        params["certification_country"] = certification_country
    if watch_region:
        params["watch_region"] = watch_region
    if original_language:
        params["with_original_language"] = original_language
    if release_date_gte:
        params["primary_release_date.gte"] = release_date_gte
    if release_date_lte:
        params["primary_release_date.lte"] = release_date_lte
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception as e:
        print(f"Error fetching discover movies: {e}", file=sys.stderr)
        return []

def fetch_discover_tv_shows(language="en-US", page=1, certification_country=None, watch_region=None, original_language=None, air_date_gte=None, air_date_lte=None):
    """Fetch TV shows from TMDB discover endpoint with filters."""
    url = f"{TMDB_BASE_URL}/discover/tv"
    params = {
        "api_key": TMDB_API_KEY,
        "language": language,
        "page": page,
        "sort_by": "popularity.desc"
    }
    
    if certification_country:
        params["certification_country"] = certification_country
    if watch_region:
        params["watch_region"] = watch_region
    if original_language:
        params["with_original_language"] = original_language
    if air_date_gte:
        params["first_air_date.gte"] = air_date_gte
    if air_date_lte:
        params["first_air_date.lte"] = air_date_lte
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception as e:
        print(f"Error fetching discover TV shows: {e}", file=sys.stderr)
        return []

def process_movie(movie_data):
    """Convert TMDB movie data to our format."""
    # Extract year from release_date
    release_date = movie_data.get("release_date", "")
    year = int(release_date[:4]) if release_date and len(release_date) >= 4 else None
    
    if not year or not movie_data.get("backdrop_path") or not movie_data.get("poster_path"):
        return None
    
    return {
        "title": movie_data["title"],
        "year": year,
        "backdropUrl": f"{IMAGE_BASE_URL}{movie_data['backdrop_path']}",
        "posterUrl": f"{IMAGE_BASE_URL}{movie_data['poster_path']}",
        "tmdbId": str(movie_data["id"]),
        "type": "movie"
    }

def process_tv_show(tv_data):
    """Convert TMDB TV show data to our format."""
    # Extract year from first_air_date
    first_air_date = tv_data.get("first_air_date", "")
    year = int(first_air_date[:4]) if first_air_date and len(first_air_date) >= 4 else None
    
    if not year or not tv_data.get("backdrop_path") or not tv_data.get("poster_path"):
        return None
    
    return {
        "title": tv_data["name"],
        "year": year,
        "backdropUrl": f"{IMAGE_BASE_URL}{tv_data['backdrop_path']}",
        "posterUrl": f"{IMAGE_BASE_URL}{tv_data['poster_path']}",
        "tmdbId": str(tv_data["id"]),
        "type": "tvshow"
    }

def fetch_media_by_language(target_language, target_count=100):
    """
    Fetch movies and TV shows using discover endpoint with regional filters.
    All content is from ES region (certification_country=ES, watch_region=ES),
    filtered by original_language.
    Fetches: 5% from before 1990, 80% from 1990-2020, and 15% from 2020+.
    
    Args:
        target_language: 'en' for English or 'es' for Spanish
        target_count: Number of items to fetch
    """
    all_media = []
    seen_ids = set()
    
    # Configure filters - ES region for all, only original_language differs
    certification_country = 'ES'
    watch_region = 'ES'
    
    if target_language == 'es':
        api_language = 'es-ES'
        original_language = 'es'
        region_label = 'Spanish (ES region, original_language=es)'
    else:  # English
        api_language = 'en-US'
        original_language = 'en'
        region_label = 'English (ES region, original_language=en)'
    
    print(f"Fetching {region_label} movies and TV shows from TMDB...")
    
    # Phase 1: Fetch classic content (before 1990): 5% of target
    classic_target = int(target_count * 0.05)
    print(f"  Fetching {classic_target} items from before 1990...")
    page = 1
    max_pages = 10
    
    while len(all_media) < classic_target and page <= max_pages:
        # Fetch discover movies from before 1990
        movies = fetch_discover_movies(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            release_date_lte="1989-12-31"
        )
        for movie in movies:
            if movie["id"] not in seen_ids:
                processed = process_movie(movie)
                if processed and len(all_media) < classic_target:
                    all_media.append(processed)
                    seen_ids.add(movie["id"])
        
        # Fetch discover TV shows from before 1990
        tv_shows = fetch_discover_tv_shows(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            air_date_lte="1989-12-31"
        )
        for show in tv_shows:
            if show["id"] not in seen_ids:
                processed = process_tv_show(show)
                if processed and len(all_media) < classic_target:
                    all_media.append(processed)
                    seen_ids.add(show["id"])
        
        page += 1
    
    print(f"  ✓ Fetched {len(all_media)} items from before 1990")
    
    # Phase 2: Fetch older content (1990-2020): 80% of target
    older_target = int(target_count * 0.80) + len(all_media)
    print(f"  Fetching {older_target - len(all_media)} items from 1990-2020...")
    page = 1
    max_pages = 20
    
    while len(all_media) < older_target and page <= max_pages:
        # Fetch discover movies from 1990-2020
        movies = fetch_discover_movies(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            release_date_gte="1990-01-01",
            release_date_lte="2019-12-31"
        )
        for movie in movies:
            if movie["id"] not in seen_ids:
                processed = process_movie(movie)
                if processed and len(all_media) < older_target:
                    all_media.append(processed)
                    seen_ids.add(movie["id"])
        
        # Fetch discover TV shows from 1990-2020
        tv_shows = fetch_discover_tv_shows(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            air_date_gte="1990-01-01",
            air_date_lte="2019-12-31"
        )
        for show in tv_shows:
            if show["id"] not in seen_ids:
                processed = process_tv_show(show)
                if processed and len(all_media) < older_target:
                    all_media.append(processed)
                    seen_ids.add(show["id"])
        
        page += 1
    
    count_1990_2020 = len([m for m in all_media if 1990 <= m['year'] < 2020])
    print(f"  ✓ Fetched {count_1990_2020} items from 1990-2020")
    
    # Phase 3: Fetch recent content (2020+): 15% of target
    recent_target = target_count
    print(f"  Fetching {recent_target - len(all_media)} items from 2020+...")
    page = 1
    max_pages = 10
    
    while len(all_media) < target_count and page <= max_pages:
        # Fetch discover movies from 2020+
        movies = fetch_discover_movies(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            release_date_gte="2020-01-01"
        )
        for movie in movies:
            if movie["id"] not in seen_ids:
                processed = process_movie(movie)
                if processed and len(all_media) < target_count:
                    all_media.append(processed)
                    seen_ids.add(movie["id"])
        
        # Fetch discover TV shows from 2020+
        tv_shows = fetch_discover_tv_shows(
            language=api_language,
            page=page,
            certification_country=certification_country,
            watch_region=watch_region,
            original_language=original_language,
            air_date_gte="2020-01-01"
        )
        for show in tv_shows:
            if show["id"] not in seen_ids:
                processed = process_tv_show(show)
                if processed and len(all_media) < target_count:
                    all_media.append(processed)
                    seen_ids.add(show["id"])
        
        page += 1
    
    recent_count = len([m for m in all_media if m['year'] >= 2020])
    classic_count = len([m for m in all_media if m['year'] < 1990])
    print(f"  ✓ Fetched {recent_count} items from 2020+")
    print(f"\n✓ Total breakdown:")
    print(f"  - Before 1990: {classic_count} items ({classic_count/len(all_media)*100:.1f}%)")
    print(f"  - 1990-2020: {count_1990_2020} items ({count_1990_2020/len(all_media)*100:.1f}%)")
    print(f"  - 2020+: {recent_count} items ({recent_count/len(all_media)*100:.1f}%)")
    print(f"✓ Found {len(all_media)} {target_language} items total")
    return all_media[:target_count]

def main():
    if not TMDB_API_KEY:
        print("Error: Please set your TMDB API key in the script")
        print("Get one for free at: https://www.themoviedb.org/settings/api")
        sys.exit(1)
    
    # Fetch English media (original_language = 'en')
    english_media = fetch_media_by_language("en", target_count=250)
    print(f"✓ Fetched {len(english_media)} English movies/shows\n")
    
    # Fetch Spanish media (original_language = 'es')
    spanish_media = fetch_media_by_language("es", target_count=250)
    print(f"✓ Fetched {len(spanish_media)} Spanish movies/shows\n")
    
    # Remove original_language field before saving (not needed in final data)
    for item in english_media + spanish_media:
        item.pop("original_language", None)
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "src" / "data" / "movies"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Sort by year
    english_media.sort(key=lambda x: x['year'])
    spanish_media.sort(key=lambda x: x['year'])
    
    # Write english.json
    english_path = output_dir / "english.json"
    with open(english_path, "w", encoding="utf-8") as f:
        json.dump(english_media, f, indent=2, ensure_ascii=False)
    print(f"✓ Created {english_path}")
    
    # Write spanish.json
    spanish_path = output_dir / "spanish.json"
    with open(spanish_path, "w", encoding="utf-8") as f:
        json.dump(spanish_media, f, indent=2, ensure_ascii=False)
    print(f"✓ Created {spanish_path}")
    
    # Count recent items
    recent_count = len([m for m in english_media + spanish_media if m['year'] >= 2020])
    
    print(f"\nSummary:")
    print(f"  Total: {len(english_media) + len(spanish_media)} movies/shows")
    print(f"  English (ES region, original_language='en'): {len(english_media)}")
    print(f"  Spanish (ES region, original_language='es'): {len(spanish_media)}")
    print(f"  Recent (2020+): {recent_count}")



if __name__ == "__main__":
    main()
