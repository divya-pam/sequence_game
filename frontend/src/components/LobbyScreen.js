import React from 'react';

function LobbyScreen({ roomCode, players, player, teamMode, onToggleTeamMode, onStartGame, onLeaveRoom }) {
  const roomLink = `${window.location.origin}?room=${roomCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    alert('Link copied to clipboard!');
  };

  const canStart = player?.isAdmin && players.length >= 2;

  return (
    <div className="screen">
      <h1>Game Lobby</h1>
      
      <div className="room-info">
        <h3>Room Code: {roomCode}</h3>
        <div className="room-link">
          <strong>Share this link:</strong><br />
          <span>{roomLink}</span>
        </div>
        <button onClick={copyLink}>Copy Link</button>
      </div>

      {player?.isAdmin && (
        <div className="team-mode-toggle">
          <label>
            <input
              type="checkbox"
              checked={teamMode}
              onChange={(e) => onToggleTeamMode(e.target.checked)}
            />
            <span>Enable Team Mode (2-3 teams)</span>
          </label>
          <p className="info-text">
            Team mode: Players work together in teams. Each team needs 2 sequences to win.
          </p>
        </div>
      )}

      <div className="players-section">
        <h3>Players ({players.length}/12):</h3>
        <div className="players-list">
          {players.map((p) => (
            <div key={p.id} className={`player-item ${p.isAdmin ? 'admin' : ''}`}>
              <span>
                <span className="player-indicator" style={{ background: p.color }}></span>
                {p.name}
                {teamMode && p.team !== null && ` (Team ${p.team + 1})`}
              </span>
              {p.isAdmin && <span>👑 Admin</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="game-rules">
        <h3>Game Rules:</h3>
        <ul>
          <li>Get 5 chips in a row (horizontal, vertical, or diagonal) to make a sequence</li>
          <li>Two sequences needed to win</li>
          <li>Corners are wild - count for everyone</li>
          <li>Two-eyed Jacks (♥♦) let you place a chip anywhere</li>
          <li>One-eyed Jacks (♠♣) remove opponent chips</li>
          <li>Dead cards (both copies played) can't be used</li>
        </ul>
      </div>

      <div className="button-group">
        <button onClick={onStartGame} disabled={!canStart}>
          {canStart ? 'Start Game' : `Waiting for players (${players.length}/2)`}
        </button>
        <button onClick={onLeaveRoom}>Leave Room</button>
      </div>
    </div>
  );
}

export default LobbyScreen;