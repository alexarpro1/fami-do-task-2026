"""
Schach mit Pygame – neu strukturiert.
Einstieg: python -m schach
oder: python schach_main.py (aus Projektroot)
"""

import pygame
import sys
import os

# Projektroot als Pfad für Imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schach_logic import (
    Pos,
    create_initial_board,
    get_piece,
    get_moves,
    get_game_result,
    apply_move,
    find_king,
    is_in_check,
)
from schach_constants import (
    BOARD_LIGHT,
    BOARD_DARK,
    WHITE_PIECE,
    BLACK_PIECE,
    HIGHLIGHT_SELECT,
    HIGHLIGHT_MOVE,
    HIGHLIGHT_CAPTURE,
    HIGHLIGHT_CHECK,
    LAST_MOVE,
    OUTLINE,
    COORD_COLOR,
    BG_COLOR,
    FELD,
    RAND,
    STATUS_H,
    FILE_LABELS,
    RANK_LABELS,
    piece_symbol,
)

BREITE = 8 * FELD + 2 * RAND
HOEHE = 8 * FELD + 2 * RAND + STATUS_H


def pixel_to_pos(px: int, py: int) -> Pos | None:
    if px < RAND or py < RAND:
        return None
    c = (px - RAND) // FELD
    r = (py - RAND) // FELD
    if 0 <= r <= 7 and 0 <= c <= 7:
        return Pos(r, c)
    return None


def pos_to_pixel(pos: Pos) -> tuple:
    cx = RAND + pos.c * FELD + FELD // 2
    cy = RAND + pos.r * FELD + FELD // 2
    return cx, cy


def draw_board(screen, font, board, turn, result, selected, possible_moves, last_move):
    # Hintergrund
    screen.fill(BG_COLOR)

    # Koordinaten links (Ränge)
    for i, label in enumerate(RANK_LABELS):
        t = font.render(label, True, COORD_COLOR)
        screen.blit(t, (RAND - 20, RAND + i * FELD + FELD // 2 - t.get_height() // 2))

    # Koordinaten unten (Linien)
    for i, label in enumerate(FILE_LABELS):
        t = font.render(label, True, COORD_COLOR)
        screen.blit(t, (RAND + i * FELD + FELD // 2 - t.get_width() // 2, RAND + 8 * FELD + 4))

    # Felder
    for r in range(8):
        for c in range(8):
            rect = pygame.Rect(RAND + c * FELD, RAND + r * FELD, FELD, FELD)
            is_light = (r + c) % 2 == 0
            base = BOARD_LIGHT if is_light else BOARD_DARK

            # Letzter Zug
            if last_move and (r, c) in ((last_move[0].r, last_move[0].c), (last_move[1].r, last_move[1].c)):
                color = tuple(min(255, base[i] + (LAST_MOVE[i] - base[i]) // 2) for i in range(3))
            else:
                color = base

            # Auswahl / mögliche Züge
            pos = Pos(r, c)
            if selected and pos.r == selected.r and pos.c == selected.c:
                color = HIGHLIGHT_SELECT
            elif possible_moves:
                if any(m.r == r and m.c == c for m in possible_moves):
                    piece = get_piece(board, pos)
                    color = HIGHLIGHT_CAPTURE if piece else HIGHLIGHT_MOVE

            # König im Schach
            king_pos = find_king(board, turn) if result is None else None
            if king_pos and king_pos.r == r and king_pos.c == c:
                color = HIGHLIGHT_CHECK

            pygame.draw.rect(screen, color, rect)
            pygame.draw.rect(screen, OUTLINE, rect, 1)

    # Figuren
    piece_font = pygame.font.SysFont("Segoe UI Symbol" if sys.platform == "win32" else "Arial", FELD - 16)
    for r in range(8):
        for c in range(8):
            piece = get_piece(board, Pos(r, c))
            if piece is None:
                continue
            color, ptype = piece
            sym = piece_symbol(color, ptype)
            text = piece_font.render(sym, True, WHITE_PIECE if color == "w" else BLACK_PIECE)
            cx, cy = RAND + c * FELD + FELD // 2, RAND + r * FELD + FELD // 2
            screen.blit(text, (cx - text.get_width() // 2, cy - text.get_height() // 2))

    # Statuszeile
    status_y = RAND + 8 * FELD + 12
    if result == "checkmate":
        winner = "Schwarz" if turn == "w" else "Weiß"
        status = f"Schachmatt – {winner} gewinnt!"
    elif result == "stalemate":
        status = "Patt – Unentschieden"
    else:
        status = "Weiß am Zug" if turn == "w" else "Schwarz am Zug"
    t = font.render(status, True, (240, 240, 240))
    screen.blit(t, (BREITE // 2 - t.get_width() // 2, status_y))


def main():
    pygame.init()
    screen = pygame.display.set_mode((BREITE, HOEHE))
    pygame.display.set_caption("Schach – Pygame")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Arial", 18)

    board = create_initial_board()
    turn = "w"
    result = None
    selected = None
    possible_moves = []
    last_move = None  # (from_pos, to_pos)
    captured_white = []
    captured_black = []

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and result is None:
                pos_click = pixel_to_pos(*event.pos)
                if pos_click is None:
                    continue
                piece = get_piece(board, pos_click)

                if selected is None:
                    if piece and piece[0] == turn:
                        selected = pos_click
                        possible_moves = get_moves(board, pos_click, turn)
                else:
                    is_dest = any(m.r == pos_click.r and m.c == pos_click.c for m in possible_moves)
                    if is_dest:
                        new_board, captured, _ = apply_move(board, selected, pos_click, turn)
                        board = new_board
                        if captured:
                            if captured[0] == "w":
                                captured_white.append(captured[1])
                            else:
                                captured_black.append(captured[1])
                        last_move = (selected, pos_click)
                        turn = "b" if turn == "w" else "w"
                        result = get_game_result(board, turn)
                        selected = None
                        possible_moves = []
                    elif piece and piece[0] == turn:
                        selected = pos_click
                        possible_moves = get_moves(board, pos_click, turn)
                    else:
                        selected = None
                        possible_moves = []
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                selected = None
                possible_moves = []

        draw_board(screen, font, board, turn, result, selected, possible_moves, last_move)
        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
