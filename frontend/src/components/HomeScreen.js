// File: frontend/src/components/HomeScreen.js
import React, { useState } from 'react';

function HomeScreen({ onCreateRoom, onJoinRoom, initialRoomCode, socketConnected }) {
  const [mode, setMode] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');

  const handleCreate = () => {
    const trimmedName = playerName.trim();
    
    if (!trimmedName) {
      alert('Please enter your name');
      return;
    }

    if (!socketConnected) {
      alert('Not connected to server. Please wait or check if backend is running.');
      return;
    }

    console.log('HomeScreen: Creating room with name:', trimmedName);
    onCreateRoom(trimmedName);
  };

  const handleJoin = () => {
    const trimmedName = playerName.trim();
    const trimmedCode = roomCode.trim().toUpperCase();
    
    if (!trimmedName) {
      alert('Please enter your name');
      return;
    }

    if (!trimmedCode) {
      alert('Please enter room code');
      return;
    }

    if (!socketConnected) {
      alert('Not connected to server. Please wait or check if backend is running.');
      return;
    }

    console.log('HomeScreen: Joining room', trimmedCode, 'with name:', trimmedName);
    onJoinRoom(trimmedName, trimmedCode);
  };

  if (mode === 'home') {
    return (
      <div className="screen">
        <h1>🎮 Sequence Game</h1>
        <p className="subtitle">Multiplayer Card Strategy Game</p>
        {!socketConnected && (
          <div className="warning-box">
            ⚠️ Not connected to server. Make sure backend is running.
          </div>
        )}
        <div className="button-group">
          <button onClick={() => setMode('create')} disabled={!socketConnected}>
            Create Room
          </button>
          <button onClick={() => setMode('join')} disabled={!socketConnected}>
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="screen">
        <h1>Create Game Room</h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <div className="button-group">
          <button onClick={handleCreate} disabled={!socketConnected || !playerName.trim()}>
            Create Room
          </button>
          <button onClick={() => setMode('home')}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>Join Game Room</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        autoFocus
      />
      <input
        type="text"
        placeholder="Enter room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
      />
      <div className="button-group">
        <button onClick={handleJoin} disabled={!socketConnected || !playerName.trim() || !roomCode.trim()}>
          Join Room
        </button>
        <button onClick={() => setMode('home')}>Back</button>
      </div>
    </div>
  );
}

export default HomeScreen;