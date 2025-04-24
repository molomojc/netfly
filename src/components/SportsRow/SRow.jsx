import { useState, useEffect } from 'react';
import SportsBanner from '../../components/SportsBanner/SportsBanner';
import './SRow.css';

const LeagueMatches = () => {
  const [selectedLeague, setSelectedLeague] = useState('UEFA');
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${selectedLeague}.txt`);
        if (!response.ok) throw new Error(`Failed to fetch ${selectedLeague} data`);

        const textData = await response.text();
        const parsedMatches = textData
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
          .map((line, index) => {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length < 5) return null;
            return {
              id: index + 1,
              date: parts[0],
              time: parts[1],
              homeTeam: parts[2],
              awayTeam: parts[3],
              title: `${parts[2]} vs ${parts[3]}`,
              venue: parts[4],
              imageUrl: parts[5] || '/images/default-match.jpg',
            };
          })
          .filter(Boolean);

        setMatches(parsedMatches);
        // Set the first match as default selected when league changes
        setSelectedMatch(parsedMatches[0] || null);
      } catch (err) {
        console.error(err);
        setError('Failed to load matches');
        setMatches([]);
        setSelectedMatch(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [selectedLeague]);

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <>
      <SportsBanner match={selectedMatch} league={selectedLeague} />
      <div className="league-matches">
        <div className="league-selector">
          <label htmlFor="league-dropdown">League: </label>
          <select
            id="league-dropdown"
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
          >
            <option value="UEFA">UEFA</option>
            <option value="Laliga">Laliga</option>
            <option value="EPL">EPL</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="match-grid">
          {matches.map((match) => (
            <div 
              className={`match-card ${selectedMatch?.id === match.id ? 'selected' : ''}`} 
              key={match.id} 
              onClick={() => handleMatchClick(match)}
            >
              <img
                src={match.imageUrl}
                alt={match.title}
                onError={(e) => { e.target.src = '/images/default-match.jpg'; }}
              />
              <h3>{match.title}</h3>
              <p>{match.date} - {match.time}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LeagueMatches;