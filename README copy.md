
# Google Maps Scraper

A Node.js application that scrapes Google Maps for auto repair shops using Puppeteer and Cheerio.

## Features

- Scrapes Google Maps search results for auto repair shops
- Extracts business information including:
  - Store name
  - Rating and number of reviews
  - Category
  - Address
  - Phone number
  - Website
  - Google Maps URL
- Uses stealth mode to avoid detection
- Auto-scrolls to load more results

## Prerequisites

- Node.js (version 18 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Run with default search (Balangoda shops):
```bash
npm start
```

### Run with custom search:
```bash
# Search for any business type in any location
node googleMaps.js "your search query here"

# Examples:
node googleMaps.js "restaurants new york"
node googleMaps.js "coffee shops los angeles"
node googleMaps.js "hotels miami"
```

### Run with auto-restart on file changes:
```bash
npm run dev
```

## Configuration

The script now accepts custom search queries as command line arguments. You can search for any business type in any location.

### Default Search
If no search query is provided, it will search for "balangoda shops".

### Custom Search
You can search for any business or location by passing it as an argument:

```bash
# Search for restaurants in New York
node googleMaps.js "restaurants new york"

# Search for coffee shops in Los Angeles
node googleMaps.js "coffee shops los angeles"

# Search for hotels in Miami
node googleMaps.js "hotels miami"

# Search for dentists in Chicago
node googleMaps.js "dentists chicago"
```

### Examples
- `node googleMaps.js "pizza places boston"`
- `node googleMaps.js "gyms san francisco"`
- `node googleMaps.js "bookstores seattle"`
- `node googleMaps.js "pet stores denver"`

## Browser Configuration

The script uses Puppeteer with stealth mode. You can modify the browser launch options in the code:

- `headless: false` - Shows the browser window (useful for debugging)
- `headless: "new"` - Runs in headless mode (commented out)
- `executablePath` - Set to your Chrome/Chromium executable path if needed

## Output

The script will output:
- Scraping progress information
- Number of businesses found
- Sample results with business details
- Total execution time

## Notes

- The script includes delays and stealth measures to avoid being blocked
- Auto-scrolling is implemented to load more results
- Error handling is included for robust operation
- Results are returned as an array of business objects

## Troubleshooting

If you encounter issues:
1. Ensure all dependencies are installed
2. Check your internet connection
3. Verify that Google Maps is accessible
4. Try running with `headless: false` to see what's happening in the browser
