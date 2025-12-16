// File: frontend/src/components/Board.js
import React from 'react';

function Board({ board, onCellClick, selectedCard }) {
  return (
    <div className="game-board">
      {board.map((row, r) => (
        row.map((cell, c) => {
          const isCorner = cell.isCorner;
          const hasChip = cell.chip !== null;
          const isClickable = !isCorner && !hasChip && selectedCard;
          const isSelectedCardMatch = selectedCard && cell.card === selectedCard;

          return (
            <div
              key={`${r}-${c}`}
              className={`board-cell ${isCorner ? 'corner' : ''} ${hasChip ? 'has-chip' : ''} ${isClickable ? 'clickable' : ''} ${isSelectedCardMatch ? 'card-match' : ''}`}
              style={hasChip ? {
                borderColor: cell.chip,
                borderWidth: '4px',
                background: '#f5f5f5'
              } : {}}
              onClick={() => isClickable && onCellClick(r, c)}
            >
              {/* Show the card symbol/value always */}
              {!isCorner && (
                <div className="board-card">
                  <span className="board-card-suit">{cell.card.slice(-1)}</span>
                  <span className="board-card-value">{cell.card.slice(0, -1)}</span>
                </div>
              )}
              {isCorner && '★'}
            </div>
          );
        })
      ))}
    </div>
  );
}

export default Board;