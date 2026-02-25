"""Schach starten – von Projektroot: python schach_spiel.py"""
import sys
import os
root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root)
from schach.schach_main import main
if __name__ == "__main__":
    main()
