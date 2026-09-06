export const LIST_EMOJI: Record<string, string> = {
  countries: "🌍",
  continents: "🌐",
  "national-parks": "🏞️",
  "us-states": "🗺️",
  "mlb-stadiums": "⚾",
  "nfl-stadiums": "🏈",
  "nba-arenas": "🏀",
  "nhl-arenas": "🏒",
  "new-7-wonders": "🏛️",
  "world-marathon-majors": "🏃",
  "grand-slam-tennis": "🎾",
  "f1-circuits": "🏎️",
  "studio-ghibli-films": "🐉",
  "pixar-films": "💡",
};

/** slug -> icon tile background tint, one of the tint colors from the brand
 * tokens table (see the redesign prompt, section 2). `ListIcon` falls back
 * to `--surface-sunken` for any slug not listed here (new list types added
 * later would otherwise render with no tile color at all). */
export const LIST_ICON_TINT: Record<string, string> = {
  countries: "#E6F8FB", // teal
  continents: "#E6F8FB", // teal
  "national-parks": "#FDECEA", // coral
  "us-states": "#E6F8FB", // teal
  "mlb-stadiums": "#FEF4D6", // yellow
  "nfl-stadiums": "#FDEEDC", // orange
  "nba-arenas": "#FDEEDC", // orange
  "nhl-arenas": "#F3F9E2", // lime
  "new-7-wonders": "#FEF4D6", // yellow
  "world-marathon-majors": "#EDEBFB", // indigo
  "grand-slam-tennis": "#F3F9E2", // lime
  "f1-circuits": "#FDECEA", // coral
  "studio-ghibli-films": "#EDEBFB", // indigo
  "pixar-films": "#FEF4D6", // yellow
};
