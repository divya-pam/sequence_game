// File: frontend/src/App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [player, setPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [teamMode, setTeamMode] = useState(false);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully!', newSocket.id);
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      alert('Cannot connect to server. Make sure the backend is running on http://localhost:5000');
    });

    setSocket(newSocket);

    // Check URL for room code
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomCode = urlParams.get('room');
    if (urlRoomCode) {
      setRoomCode(urlRoomCode);
    }

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket event listeners');

    socket.on('room_created', (data) => {
      console.log('Room created:', data);
      setRoomCode(data.roomCode);
      setPlayer(data.player);
      setPlayers([data.player]);
      setScreen('lobby');
    });

    socket.on('room_joined', (data) => {
      console.log('Room joined:', data);
      setRoomCode(data.roomCode);
      setPlayer(data.player);
      setPlayers(data.players);
      setScreen('lobby');
    });

    socket.on('players_updated', (data) => {
      console.log('Players updated:', data);
      setPlayers(data.players);
    });

    socket.on('game_settings_updated', (data) => {
      console.log('Game settings updated:', data);
      setTeamMode(data.teamMode);
      setPlayers(data.players);
    });

    socket.on('player_left', (data) => {
      console.log('Player left:', data);
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socket.on('game_started', (data) => {
      console.log('Game started:', data);
      setGameState(data);
      setScreen('game');
    });

    socket.on('game_updated', (data) => {
      console.log('Game updated:', data);
      setGameState(prev => ({
        ...prev,
        board: data.board,
        currentTurnIndex: data.currentTurnIndex,
        sequences: data.sequences,
        winner: data.winner
      }));
    });

    socket.on('hand_updated', (data) => {
      console.log('Hand updated:', data);
      setGameState(prev => ({
        ...prev,
        hand: data.hand
      }));
    });

    socket.on('error', (data) => {
      console.error('Server error:', data);
      alert(data.message);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('players_updated');
      socket.off('game_settings_updated');
      socket.off('player_left');
      socket.off('game_started');
      socket.off('game_updated');
      socket.off('hand_updated');
      socket.off('error');
    };
  }, [socket]);

  const createRoom = (playerName) => {
    console.log('Creating room for player:', playerName);
    
    if (!socket) {
      console.error('Socket not initialized');
      alert('Connection not ready. Please wait a moment and try again.');
      return;
    }

    if (!socketConnected) {
      console.error('Socket not connected');
      alert('Not connected to server. Please check if the backend is running.');
      return;
    }

    console.log('Emitting create_room event');
    socket.emit('create_room', { playerName });
  };

  const joinRoom = (playerName, code) => {
    console.log('Joining room:', code, 'as player:', playerName);
    
    if (!socket || !socketConnected) {
      alert('Not connected to server. Please check if the backend is running.');
      return;
    }

    socket.emit('join_room', { playerName, roomCode: code });
  };

  const toggleTeamMode = (enabled) => {
    console.log('Toggling team mode:', enabled);
    socket.emit('toggle_team_mode', { roomCode, teamMode: enabled });
  };

  const startGame = () => {
    console.log('Starting game in room:', roomCode);
    socket.emit('start_game', { roomCode });
  };

  const playCard = (card, row, col) => {
    console.log('Playing card:', card, 'at position:', row, col);
    socket.emit('play_card', { roomCode, card, row, col });
  };

  const leaveRoom = () => {
    console.log('Leaving room:', roomCode);
    socket.emit('leave_room', { roomCode });
    setScreen('home');
    setRoomCode('');
    setPlayer(null);
    setPlayers([]);
    setGameState(null);
  };

  return (
    <div className="App">
      {!socketConnected && (
        <div className="connection-status">
          <p>⚠️ Connecting to server...</p>
          <p style={{fontSize: '12px', color: '#666'}}>
            Make sure backend is running on http://localhost:5000
          </p>
        </div>
      )}
      
      {screen === 'home' && (
        <HomeScreen 
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          initialRoomCode={roomCode}
          socketConnected={socketConnected}
        />
      )}
      
      {screen === 'lobby' && (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          player={player}
          teamMode={teamMode}
          onToggleTeamMode={toggleTeamMode}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
        />
      )}
      
      {screen === 'game' && gameState && (
        <GameScreen
          gameState={gameState}
          player={player}
          onPlayCard={playCard}
          onLeaveGame={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;