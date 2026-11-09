#!/usr/bin/env python3
"""
Fetch movies or TV shows from TMDB API using discover endpoints.
Creates media database with title, year, and backdrop image URLs.
Uses discover endpoints with certification_country, watch_region, and original_language filters.
Outputs to src/data/movies.json or src/data/shows.json (one file per media type, with a language field).

Usage:
    python3 scripts/fetch-movies.py movies [--count 250]
    python3 scripts/fetch-movies.py shows [--count 250]
"""
import os
import sys
import argparse
import json
from pathlib import Path

import requests

# TMDB API Configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

# Per media type: TMDB discover endpoint and the name of its date filter.
DISCOVER = {
    "movies": {"endpoint": "movie", "date_field": "primary_release_date"},
    "shows": {"endpoint": "tv", "date_field": "first_air_date"},
}

# Eras to sample, in order: (label, share of the target, date_gte, date_lte, max_pages).
# A share of None means "fill up to the full target".
ERAS = [
    ("before 1990", 0.05, None, "1989-12-31", 10),
    ("1990-2019", 0.80, "1990-01-01", "2019-12-31", 20),
    ("2020+", None, "2020-01-01", None, 10),
]


def fetch_discover(media_type, language="en-US", page=1, certification_country=None, watch_region=None,
                   original_language=None, date_gte=None, date_lte=None):
    """Fetch one page of movies or TV shows from the TMDB discover endpoint."""
    config = DISCOVER[media_type]
    params = {
        "api_key": TMDB_API_KEY,
        "language": language,
        "page": page,
        "sort_by": "popularity.desc",
    }
    optional = {
        "certification_country": certification_country,
        "watch_region": watch_region,
        "with_original_language": original_language,
        f"{config['date_field']}.gte": date_gte,
        f"{config['date_field']}.lte": date_lte,
    }
    params.update({key: value for key, value in optional.items() if value})

    try:
        response = requests.get(f"{TMDB_BASE_URL}/discover/{config['endpoint']}", params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception as e:
        print(f"Error fetching discover {media_type}: {e}", file=sys.stderr)
        return []

def process_movie(movie_data, language='en'):
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
        "type": "movie",
        "language": language
    }

def process_tv_show(tv_data, language='en'):
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
        "type": "show",
        "language": language
    }

def fetch_media_by_language(target_language, media_type, target_count=100):
    """
    Fetch movies or TV shows using the discover endpoint with regional filters.
    All content is from the ES region (certification_country=ES, watch_region=ES),
    filtered by original_language.
    Fetches: 5% from before 1990, 80% from 1990-2019, and the rest from 2020+.

    Args:
        target_language: 'en' for English or 'es' for Spanish
        media_type: 'movies' or 'shows'
        target_count: Number of items to fetch
    """
    process = process_movie if media_type == "movies" else process_tv_show
    api_language = "es-ES" if target_language == "es" else "en-US"
    all_media = []
    seen_ids = set()

    print(f"Fetching {target_language} {media_type} (ES region, original_language={target_language}) from TMDB...")

    for label, share, date_gte, date_lte, max_pages in ERAS:
        era_target = target_count if share is None else len(all_media) + int(target_count * share)
        print(f"  Fetching {era_target - len(all_media)} items from {label}...")
        page = 1
        while len(all_media) < era_target and page <= max_pages:
            results = fetch_discover(
                media_type,
                language=api_language,
                page=page,
                certification_country="ES",
                watch_region="ES",
                original_language=target_language,
                date_gte=date_gte,
                date_lte=date_lte,
            )
            if not results:
                break
            for result in results:
                if result["id"] in seen_ids or len(all_media) >= era_target:
                    continue
                processed = process(result, target_language)
                if processed:
                    all_media.append(processed)
                    seen_ids.add(result["id"])
            page += 1
        print(f"  ✓ {len(all_media)} items so far")

    print(f"✓ Found {len(all_media)} {target_language} {media_type} total")
    return all_media[:target_count]


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Fetch movies or TV shows from TMDB API'
    )
    parser.add_argument(
        'media_type',
        choices=['movies', 'shows'],
        help='Type of media to fetch (movies or shows)'
    )
    parser.add_argument(
        '--count',
        type=int,
        default=250,
        help='Total number of items to fetch per language (default: 250)'
    )
    args = parser.parse_args()
    
    if not TMDB_API_KEY:
        print("Error: Please set TMDB_API_KEY environment variable")
        print("Get one for free at: https://www.themoviedb.org/settings/api")
        sys.exit(1)
    
    media_type = args.media_type
    target_count = args.count
    
    # Fetch English media
    english_media = fetch_media_by_language("en", media_type, target_count=target_count)
    print(f"\n✓ Fetched {len(english_media)} English {media_type}\n")
    
    # Fetch Spanish media
    spanish_media = fetch_media_by_language("es", media_type, target_count=target_count)
    print(f"\n✓ Fetched {len(spanish_media)} Spanish {media_type}\n")
    
    # Combine all media
    all_media = english_media + spanish_media
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "src" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Sort by year
    all_media.sort(key=lambda x: x['year'])
    
    # Write to file
    output_path = output_dir / f"{media_type}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_media, f, indent=2, ensure_ascii=False)
    print(f"✓ Created {output_path}")
    
    # Count by era
    recent_count = len([m for m in all_media if m['year'] >= 2020])
    classic_count = len([m for m in all_media if m['year'] < 1990])
    count_1990_2020 = len([m for m in all_media if 1990 <= m['year'] < 2020])
    
    print(f"\nSummary:")
    print(f"  Total: {len(all_media)} {media_type}")
    print(f"  English (ES region, original_language='en'): {len(english_media)}")
    print(f"  Spanish (ES region, original_language='es'): {len(spanish_media)}")
    print(f"\n  By era:")
    print(f"    Before 1990: {classic_count} items ({classic_count/len(all_media)*100:.1f}%)")
    print(f"    1990-2020: {count_1990_2020} items ({count_1990_2020/len(all_media)*100:.1f}%)")
    print(f"    2020+: {recent_count} items ({recent_count/len(all_media)*100:.1f}%)")



if __name__ == "__main__":
    main()
