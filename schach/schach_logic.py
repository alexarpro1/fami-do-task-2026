# Schach – Logikmodul (regelkonform, ohne Rochade/En-passant in v1)
# Brett: 8x8, board[r][c] = None | (color, type)

from typing import Optional
from dataclasses import dataclass

Color = str  # "w" | "b"
PieceType = str  # "K"|"Q"|"R"|"B"|"N"|"P"

@dataclass(frozen=True)
class Pos:
    r: int
    c: int

    def __eq__(self, other):
        if not isinstance(other, Pos):
            return False
        return self.r == other.r and self.c == other.c


def _piece(color: Color, ptype: PieceType) -> tuple:
    return (color, ptype)


def create_initial_board() -> list:
    """8x8, Weiß unten (Zeile 7), Schwarz oben (Zeile 0)."""
    board = [[None] * 8 for _ in range(8)]
    back = lambda c: [
        _piece(c, "R"), _piece(c, "N"), _piece(c, "B"), _piece(c, "Q"),
        _piece(c, "K"), _piece(c, "B"), _piece(c, "N"), _piece(c, "R"),
    ]
    for c in range(8):
        board[0][c] = back("b")[c]
        board[1][c] = _piece("b", "P")
        board[6][c] = _piece("w", "P")
        board[7][c] = back("w")[c]
    return board


def in_bounds(pos: Pos) -> bool:
    return 0 <= pos.r < 8 and 0 <= pos.c < 8


def get_piece(board: list, pos: Pos):
    return board[pos.r][pos.c] if in_bounds(pos) else None


def copy_board(board: list) -> list:
    return [[cell for cell in row] for row in board]


def _add_move(moves: list, board: list, piece: tuple, to: Pos) -> None:
    if not in_bounds(to):
        return
    target = get_piece(board, to)
    if target is None or target[0] != piece[0]:
        moves.append(to)


def _add_ray(moves: list, board: list, pos: Pos, piece: tuple, dr: int, dc: int) -> None:
    r, c = pos.r + dr, pos.c + dc
    while in_bounds(Pos(r, c)):
        target = get_piece(board, Pos(r, c))
        if target is None:
            moves.append(Pos(r, c))
            r += dr
            c += dc
            continue
        if target[0] != piece[0]:
            moves.append(Pos(r, c))
        break


def get_moves(board: list, pos: Pos, turn: Color) -> list:
    """Alle legalen Zielfelder für die Figur auf pos (ohne Selbstschach)."""
    piece = get_piece(board, pos)
    if piece is None or piece[0] != turn:
        return []
    color, ptype = piece
    moves = []

    def add(r, c):
        _add_move(moves, board, piece, Pos(r, c))

    if ptype == "P":
        direction = -1 if color == "w" else 1
        start_row = 6 if color == "w" else 1
        nr = pos.r + direction
        if in_bounds(Pos(nr, pos.c)) and get_piece(board, Pos(nr, pos.c)) is None:
            moves.append(Pos(nr, pos.c))
            if pos.r == start_row and get_piece(board, Pos(pos.r + 2 * direction, pos.c)) is None:
                moves.append(Pos(pos.r + 2 * direction, pos.c))
        for dc in (-1, 1):
            to = Pos(nr, pos.c + dc)
            if in_bounds(to):
                t = get_piece(board, to)
                if t and t[0] != color:
                    moves.append(to)
    elif ptype == "N":
        for dr, dc in [(2,1),(2,-1),(-2,1),(-2,-1),(1,2),(1,-2),(-1,2),(-1,-2)]:
            add(pos.r + dr, pos.c + dc)
    elif ptype == "K":
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    add(pos.r + dr, pos.c + dc)
    elif ptype == "B":
        for dr, dc in [(1,1),(1,-1),(-1,1),(-1,-1)]:
            _add_ray(moves, board, pos, piece, dr, dc)
    elif ptype == "R":
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            _add_ray(moves, board, pos, piece, dr, dc)
    elif ptype == "Q":
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    _add_ray(moves, board, pos, piece, dr, dc)

    return [to for to in moves if not _would_leave_king_in_check(board, pos, to, turn)]


def find_king(board: list, color: Color) -> Optional[Pos]:
    for r in range(8):
        for c in range(8):
            p = get_piece(board, Pos(r, c))
            if p and p[1] == "K" and p[0] == color:
                return Pos(r, c)
    return None


def _get_moves_ignoring_king(board: list, pos: Pos, turn: Color) -> list:
    piece = get_piece(board, pos)
    if piece is None or piece[0] != turn:
        return []
    color, ptype = piece
    moves = []
    def add(r, c):
        _add_move(moves, board, piece, Pos(r, c))
    if ptype == "P":
        direction = -1 if color == "w" else 1
        start_row = 6 if color == "w" else 1
        nr = pos.r + direction
        if in_bounds(Pos(nr, pos.c)) and get_piece(board, Pos(nr, pos.c)) is None:
            moves.append(Pos(nr, pos.c))
            if pos.r == start_row and get_piece(board, Pos(pos.r + 2 * direction, pos.c)) is None:
                moves.append(Pos(pos.r + 2 * direction, pos.c))
        for dc in (-1, 1):
            to = Pos(nr, pos.c + dc)
            if in_bounds(to):
                t = get_piece(board, to)
                if t and t[0] != color:
                    moves.append(to)
    elif ptype == "N":
        for dr, dc in [(2,1),(2,-1),(-2,1),(-2,-1),(1,2),(1,-2),(-1,2),(-1,-2)]:
            add(pos.r + dr, pos.c + dc)
    elif ptype == "K":
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    add(pos.r + dr, pos.c + dc)
    elif ptype == "B":
        for dr, dc in [(1,1),(1,-1),(-1,1),(-1,-1)]:
            _add_ray(moves, board, pos, piece, dr, dc)
    elif ptype == "R":
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            _add_ray(moves, board, pos, piece, dr, dc)
    elif ptype == "Q":
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    _add_ray(moves, board, pos, piece, dr, dc)
    return moves


def _is_square_attacked(board: list, pos: Pos, by_color: Color) -> bool:
    for r in range(8):
        for c in range(8):
            piece = get_piece(board, Pos(r, c))
            if piece and piece[0] == by_color:
                for m in _get_moves_ignoring_king(board, Pos(r, c), by_color):
                    if m.r == pos.r and m.c == pos.c:
                        return True
    return False


def _would_leave_king_in_check(board: list, from_pos: Pos, to: Pos, turn: Color) -> bool:
    next_board = copy_board(board)
    next_board[to.r][to.c] = next_board[from_pos.r][from_pos.c]
    next_board[from_pos.r][from_pos.c] = None
    king_pos = find_king(next_board, turn)
    if king_pos is None:
        return False
    opp = "b" if turn == "w" else "w"
    return _is_square_attacked(next_board, king_pos, opp)


def is_in_check(board: list, turn: Color) -> bool:
    king_pos = find_king(board, turn)
    if king_pos is None:
        return False
    opp = "b" if turn == "w" else "w"
    return _is_square_attacked(board, king_pos, opp)


def _has_any_legal_move(board: list, turn: Color) -> bool:
    for r in range(8):
        for c in range(8):
            if get_moves(board, Pos(r, c), turn):
                return True
    return False


def get_game_result(board: list, turn: Color) -> Optional[str]:
    """'checkmate' | 'stalemate' | None"""
    has_move = _has_any_legal_move(board, turn)
    check = is_in_check(board, turn)
    if not has_move:
        return "checkmate" if check else "stalemate"
    return None


def apply_move(board: list, from_pos: Pos, to: Pos, turn: Color):
    """Führt Zug aus. Gibt (neues_board, captured_piece oder None, promoted: bool)."""
    next_board = copy_board(board)
    piece = next_board[from_pos.r][from_pos.c]
    if piece is None:
        return next_board, None, False
    captured = next_board[to.r][to.c]
    next_board[to.r][to.c] = piece
    next_board[from_pos.r][from_pos.c] = None
    promoted = False
    if piece[1] == "P" and (to.r == 0 or to.r == 7):
        next_board[to.r][to.c] = (piece[0], "Q")
        promoted = True
    return next_board, captured, promoted
