import React from 'react';

function PlayerHand({ hand, selectedCard, onCardSelect }) {
  return (
    <div className="hand-section">
      <h3>Your Cards:</h3>
      <div className="player-hand">
        {hand.map((card, idx) => (
          <div
            key={`${card}-${idx}`}
            className={`card ${selectedCard === card ? 'selected' : ''}`}
            onClick={() => onCardSelect(card)}
          >
            <div className="card-suit">{card.slice(-1)}</div>
            <div className="card-value">{card.slice(0, -1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerHand;