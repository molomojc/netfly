// src/requests/fetchUEFAData.js
// src/requests/fetchUEFAData.js
export const FetchBannerData = async (type) => {
  try {
    const response = await fetch(`${type}.txt`);
    console.log('Response:', response); // Debugging line
    if (!response.ok) throw new Error('Failed to fetch UEFA data');
    
    const textData = await response.text();
    
    // Parse with robust validation
    const matches = textData
      .split('\n')
      .filter(line => {
        // Skip empty lines and comments
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#');
      })
      .map(line => {
        const parts = line.split('|').map(part => part.trim());
        
        // Validate we have all required fields
        if (parts.length < 5) {
          console.warn('Skipping malformed line:', line);
          return null;
        }
        
        return {
          date: parts[0] || 'Date not specified',
          time: parts[1] || 'Time not specified',
          homeTeam: parts[2] || 'Home Team',
          awayTeam: parts[3] || 'Away Team',
          venue: parts[4] || 'Venue not specified',
          imageUrl: parts[5] || '/images/default-match.jpg'
        };
      })
      .filter(match => match !== null); // Remove any null entries from malformed lines
    
    if (matches.length === 0) {
      // Return default data if no valid matches found
      return {
        title: "Upcoming UEFA Matches",
        description: "No matches currently scheduled",
        imageUrl: "/images/uefa-default.jpg",
        allMatches: []
      };
    }
    
    // Select a random match
    const selectedMatch = matches[Math.floor(Math.random() * matches.length)];
    
    return {
      title: `${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}`,
      description: `${selectedMatch.date} at ${selectedMatch.venue}`,
      imageUrl: selectedMatch.imageUrl,
      allMatches: matches
    };
    
  } catch (error) {
    console.error('Error processing UEFA data:', error);
    // Return fallback data
    return {
      title: "UEFA Champions League",
      description: "Check back soon for match updates",
      imageUrl: "/images/uefa-default.jpg",
      allMatches: []
    };
  }
};