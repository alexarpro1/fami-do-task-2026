# Schach – Konstanten und Unicode-Symbole für Pygame

# Unicode-Figuren (Weiß / Schwarz)
SYMBOLS = {
    ("w", "K"): "\u2654",  # ♔
    ("w", "Q"): "\u2655",  # ♕
    ("w", "R"): "\u2656",  # ♖
    ("w", "B"): "\u2657",  # ♗
    ("w", "N"): "\u2658",  # ♘
    ("w", "P"): "\u2659",  # ♙
    ("b", "K"): "\u265A",  # ♚
    ("b", "Q"): "\u265B",  # ♛
    ("b", "R"): "\u265C",  # ♜
    ("b", "B"): "\u265D",  # ♝
    ("b", "N"): "\u265E",  # ♞
    ("b", "P"): "\u265F",  # ♟
}


def piece_symbol(color: str, ptype: str) -> str:
    return SYMBOLS.get((color, ptype), "?")


# Pygame-Farben (R, G, B)
BOARD_LIGHT = (222, 184, 135)
BOARD_DARK = (139, 90, 43)
WHITE_PIECE = (255, 255, 255)
BLACK_PIECE = (45, 45, 45)
HIGHLIGHT_SELECT = (255, 220, 100)
HIGHLIGHT_MOVE = (120, 200, 120)
HIGHLIGHT_CAPTURE = (220, 100, 100)
HIGHLIGHT_CHECK = (220, 60, 60)
LAST_MOVE = (200, 180, 120)
OUTLINE = (30, 30, 30)
COORD_COLOR = (80, 70, 60)
BG_COLOR = (50, 50, 55)

# Layout
FELD = 64
RAND = 48
STATUS_H = 56
FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"]
RANK_LABELS = ["8", "7", "6", "5", "4", "3", "2", "1"]
