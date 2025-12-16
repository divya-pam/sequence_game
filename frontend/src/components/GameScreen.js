// File: frontend/src/components/GameScreen.js
import React, { useState } from 'react';
import Board from './Board';
import PlayerHand from './PlayerHand';

function GameScreen({ gameState, player, onPlayCard, onLeaveGame }) {
  const [selectedCard, setSelectedCard] = useState(null);

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer.id === player.id;
  
  // Find the current player's color
  const myPlayerData = gameState.players.find(p => p.id === player.id);
  const myColor = myPlayerData ? myPlayerData.color : '#667eea';

  const handleCardSelect = (card) => {
    setSelectedCard(card);
  };

  const handleCellClick = (row, col) => {
    if (!isMyTurn) {
      alert("Not your turn!");
      return;
    }

    if (!selectedCard) {
      alert("Please select a card first!");
      return;
    }

    onPlayCard(selectedCard, row, col);
    setSelectedCard(null);
  };

  if (gameState.winner) {
    return (
      <div className="screen">
        <h1>Game Over!</h1>
        <div className="winner-announcement">
          <h2>🎉 {gameState.winner.playerName} wins! 🎉</h2>
          {gameState.teamMode && (
            <p>Team {gameState.winner.team + 1} Victory!</p>
          )}
        </div>
        <button onClick={onLeaveGame}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="screen game-screen">
      <h1>Sequence</h1>

      <div className="game-status">
        <span className="turn-indicator" style={{ background: currentPlayer.color }}></span>
        {isMyTurn ? "Your turn!" : `${currentPlayer.name}'s turn`}
      </div>

      {gameState.sequences && gameState.sequences.length > 0 && (
        <div className="sequences-info">
          <h3>Sequences Made: {gameState.sequences.length}</h3>
        </div>
      )}

      <Board
        board={gameState.board}
        onCellClick={handleCellClick}
        selectedCard={selectedCard}
      />

      <PlayerHand
        hand={gameState.hand}
        selectedCard={selectedCard}
        onCardSelect={handleCardSelect}
        playerColor={myColor}
      />

      <div className="players-info">
        <h3>Players:</h3>
        {gameState.players.map((p, idx) => (
          <div key={p.id} className={`player-status ${idx === gameState.currentTurnIndex ? 'active' : ''}`}>
            <span className="player-indicator" style={{ background: p.color }}></span>
            {p.name}
            {gameState.teamMode && ` (Team ${p.team + 1})`}
          </div>
        ))}
      </div>

      <button onClick={onLeaveGame} className="leave-btn">Leave Game</button>
    </div>
  );
}

export default GameScreen;