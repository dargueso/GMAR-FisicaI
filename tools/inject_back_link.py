#!/usr/bin/env python3
"""Inject a fixed top-right "Back to website" link into the deployed
Coriolis simulation HTML. Idempotent: re-running on an already-injected
file is a no-op.
"""
import sys
from pathlib import Path

BACK_CSS = """
    .back-link {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 100;
      background: var(--clr-surface);
      border: 1px solid var(--clr-accent);
      border-radius: 6px;
      padding: 7px 14px;
      color: var(--clr-text);
      text-decoration: none;
      font-size: 0.85rem;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;
    }
    .back-link:hover { background: var(--clr-accent); color: #fff; }
"""

BACK_LINK = '<a class="back-link" href="/#teaching">← Back to website</a>\n\n'


def main(path: str) -> None:
    p = Path(path)
    html = p.read_text(encoding="utf-8")
    if "back-link" in html:
        return
    html = html.replace("  </style>", BACK_CSS.rstrip() + "\n  </style>")
    html = html.replace("<body>\n", "<body>\n\n" + BACK_LINK)
    p.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1])
