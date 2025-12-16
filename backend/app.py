from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random
import string
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Game state storage
rooms = {}

# Board layout for Sequence game
BOARD_LAYOUT = [
    ['*', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '*'],
    ['6♣', '5♣', '4♣', '3♣', '2♣', 'A♥', 'K♥', 'Q♥', '10♥', '10♠'],
    ['7♣', 'A♠', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '9♥', 'Q♠'],
    ['8♣', 'K♠', '6♣', '5♣', '4♣', '3♣', '2♣', '8♦', '8♥', 'K♠'],
    ['9♣', 'Q♠', '7♣', '6♥', '5♥', '4♥', 'A♣', '9♦', '7♥', 'A♠'],
    ['10♣', '10♠', '8♣', '7♥', '2♥', '3♥', 'K♣', '10♦', '6♥', '2♦'],
    ['Q♣', '9♠', '9♣', '8♥', '9♥', '10♥', 'Q♣', 'Q♦', '5♥', '3♦'],
    ['K♣', '8♠', '10♣', 'Q♣', 'K♣', 'A♣', 'K♦', 'K♦', '4♥', '4♦'],
    ['A♣', '7♠', '6♠', '5♠', '4♠', '3♠', '2♠', 'A♦', '3♥', '5♦'],
    ['*', 'A♦', 'K♦', 'Q♦', '10♦', '9♦', '8♦', '7♦', '6♦', '*']
]

COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
TEAM_COLORS = [['red', 'green'], ['blue', 'yellow'], ['purple', 'orange']]

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def create_deck():
    suits = ['♠', '♥', '♦', '♣']
    values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    deck = []
    
    # Two decks for Sequence
    for _ in range(2):
        for suit in suits:
            for value in values:
                deck.append(value + suit)
    
    random.shuffle(deck)
    return deck

def initialize_board():
    board = []
    for row in BOARD_LAYOUT:
        board_row = []
        for cell in row:
            board_row.append({'card': cell, 'chip': None, 'isCorner': cell == '*'})
        board.append(board_row)
    return board

def deal_cards(room_code, cards_per_player=7):
    room = rooms[room_code]
    for player in room['players']:
        player['hand'] = []
        for _ in range(cards_per_player):
            if room['deck']:
                player['hand'].append(room['deck'].pop())

def check_sequence(board, row, col, color):
    """Check for 5 in a row in all directions"""
    directions = [
        (0, 1),   # horizontal
        (1, 0),   # vertical
        (1, 1),   # diagonal right
        (1, -1)   # diagonal left
    ]
    
    for dr, dc in directions:
        count = 1  # Count the current chip
        
        # Check forward direction
        r, c = row + dr, col + dc
        while 0 <= r < 10 and 0 <= c < 10:
            cell = board[r][c]
            if cell['chip'] == color or cell['isCorner']:
                count += 1
                if count >= 5:
                    return True
            else:
                break
            r, c = r + dr, c + dc
        
        # Check backward direction
        r, c = row - dr, col - dc
        while 0 <= r < 10 and 0 <= c < 10:
            cell = board[r][c]
            if cell['chip'] == color or cell['isCorner']:
                count += 1
                if count >= 5:
                    return True
            else:
                break
            r, c = r - dr, c - dc
    
    return False

def get_team_color(player_color, team_mode):
    """Get the team color for a player"""
    if not team_mode:
        return player_color
    
    for team in TEAM_COLORS:
        if player_color in team:
            return team
    return [player_color]

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Handle player leaving rooms
    for room_code, room in list(rooms.items()):
        for player in room['players']:
            if player['id'] == request.sid:
                room['players'].remove(player)
                emit('player_left', {'playerId': request.sid, 'playerName': player['name']}, 
                     room=room_code)
                
                # Remove room if empty
                if not room['players']:
                    del rooms[room_code]
                # Assign new admin if needed
                elif player['isAdmin'] and room['players']:
                    room['players'][0]['isAdmin'] = True
                    emit('players_updated', {'players': room['players']}, room=room_code)
                break

@socketio.on('create_room')
def handle_create_room(data):
    room_code = generate_room_code()
    player = {
        'id': request.sid,
        'name': data['playerName'],
        'color': COLORS[0],
        'isAdmin': True,
        'hand': [],
        'team': None
    }
    
    rooms[room_code] = {
        'code': room_code,
        'players': [player],
        'board': initialize_board(),
        'deck': create_deck(),
        'gameStarted': False,
        'currentTurnIndex': 0,
        'teamMode': False,
        'sequences': [],
        'deadCards': []  # For Jacks
    }
    
    join_room(room_code)
    emit('room_created', {'roomCode': room_code, 'player': player})

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data['roomCode']
    
    if room_code not in rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    room = rooms[room_code]
    
    if room['gameStarted']:
        emit('error', {'message': 'Game already started'})
        return
    
    if len(room['players']) >= 12:
        emit('error', {'message': 'Room is full (max 12 players)'})
        return
    
    player = {
        'id': request.sid,
        'name': data['playerName'],
        'color': COLORS[len(room['players']) % len(COLORS)],
        'isAdmin': False,
        'hand': [],
        'team': None
    }
    
    room['players'].append(player)
    join_room(room_code)
    
    emit('room_joined', {'roomCode': room_code, 'player': player, 'players': room['players']})
    emit('players_updated', {'players': room['players']}, room=room_code, include_self=False)

@socketio.on('toggle_team_mode')
def handle_toggle_team_mode(data):
    room_code = data['roomCode']
    room = rooms[room_code]
    
    # Only admin can toggle
    player = next((p for p in room['players'] if p['id'] == request.sid), None)
    if not player or not player['isAdmin']:
        return
    
    room['teamMode'] = data['teamMode']
    
    # Assign teams if team mode is enabled
    if room['teamMode']:
        num_teams = min(3, (len(room['players']) + 1) // 2)  # Max 3 teams
        for i, player in enumerate(room['players']):
            team_idx = i % num_teams
            player['team'] = team_idx
            player['color'] = TEAM_COLORS[team_idx][0]
    else:
        for i, player in enumerate(room['players']):
            player['team'] = None
            player['color'] = COLORS[i % len(COLORS)]
    
    emit('game_settings_updated', {
        'teamMode': room['teamMode'],
        'players': room['players']
    }, room=room_code)

@socketio.on('start_game')
def handle_start_game(data):
    room_code = data['roomCode']
    room = rooms[room_code]
    
    # Verify admin
    player = next((p for p in room['players'] if p['id'] == request.sid), None)
    if not player or not player['isAdmin']:
        emit('error', {'message': 'Only admin can start the game'})
        return
    
    if len(room['players']) < 2:
        emit('error', {'message': 'Need at least 2 players to start'})
        return
    
    room['gameStarted'] = True
    room['currentTurnIndex'] = 0
    deal_cards(room_code)
    
    # Send game state to all players
    for p in room['players']:
        player_data = {
            'board': room['board'],
            'currentTurnIndex': room['currentTurnIndex'],
            'players': room['players'],
            'hand': p['hand'],
            'teamMode': room['teamMode']
        }
        socketio.emit('game_started', player_data, room=p['id'])

@socketio.on('play_card')
def handle_play_card(data):
    room_code = data['roomCode']
    room = rooms[room_code]
    
    current_player = room['players'][room['currentTurnIndex']]
    
    # Verify it's the player's turn
    if current_player['id'] != request.sid:
        emit('error', {'message': 'Not your turn'})
        return
    
    card = data['card']
    row = data['row']
    col = data['col']
    
    # Verify card is in hand
    if card not in current_player['hand']:
        emit('error', {'message': 'Card not in hand'})
        return
    
    cell = room['board'][row][col]
    
    # Handle Jacks (one-eyed and two-eyed)
    if card.startswith('J'):
        if card in ['J♥', 'J♦']:  # Two-eyed jacks - place anywhere
            if cell['chip'] is not None or cell['isCorner']:
                emit('error', {'message': 'Cannot place chip here'})
                return
            cell['chip'] = current_player['color']
        else:  # One-eyed jacks - remove opponent chip
            if cell['chip'] is None or cell['chip'] == current_player['color'] or cell['isCorner']:
                emit('error', {'message': 'Cannot remove this chip'})
                return
            cell['chip'] = None
    else:
        # Normal card play
        if cell['card'] != card:
            emit('error', {'message': 'Card does not match board position'})
            return
        
        if cell['chip'] is not None or cell['isCorner']:
            emit('error', {'message': 'Position already occupied'})
            return
        
        cell['chip'] = current_player['color']
    
    # Remove card from hand and draw new one
    current_player['hand'].remove(card)
    if room['deck']:
        current_player['hand'].append(room['deck'].pop())
    
    # Check for win
    winner = None
    team_colors = get_team_color(current_player['color'], room['teamMode'])
    
    for team_color in team_colors if isinstance(team_colors, list) else [team_colors]:
        if check_sequence(room['board'], row, col, team_color):
            room['sequences'].append({'color': team_color, 'timestamp': datetime.now().isoformat()})
            
            # Check if team/player has won (2 sequences needed)
            team_sequence_count = sum(1 for seq in room['sequences'] 
                                     if seq['color'] in (team_colors if isinstance(team_colors, list) else [team_colors]))
            
            if team_sequence_count >= 2:
                winner = {
                    'playerId': current_player['id'],
                    'playerName': current_player['name'],
                    'team': current_player['team'],
                    'teamMode': room['teamMode']
                }
                break
    
    # Next turn
    if not winner:
        room['currentTurnIndex'] = (room['currentTurnIndex'] + 1) % len(room['players'])
    
    # Send updated game state
    game_update = {
        'board': room['board'],
        'currentTurnIndex': room['currentTurnIndex'],
        'sequences': room['sequences'],
        'winner': winner
    }
    
    emit('game_updated', game_update, room=room_code, include_self=False)
    
    # Send hand update to current player
    emit('hand_updated', {'hand': current_player['hand']})
    emit('game_updated', game_update)

@socketio.on('leave_room')
def handle_leave_room(data):
    room_code = data['roomCode']
    if room_code in rooms:
        leave_room(room_code)
        room = rooms[room_code]
        
        player = next((p for p in room['players'] if p['id'] == request.sid), None)
        if player:
            room['players'].remove(player)
            emit('player_left', {'playerId': request.sid, 'playerName': player['name']}, 
                 room=room_code)
            
            # Remove room if empty
            if not room['players']:
                del rooms[room_code]
            # Assign new admin if needed
            elif player['isAdmin'] and room['players']:
                room['players'][0]['isAdmin'] = True
                emit('players_updated', {'players': room['players']}, room=room_code)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)

