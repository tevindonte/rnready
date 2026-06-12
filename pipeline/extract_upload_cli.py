"""CLI: extract text from uploaded file path (stdout)."""

import sys

from sources.file_upload import extract_file_text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_upload_cli.py <path>", file=sys.stderr)
        sys.exit(1)
    print(extract_file_text(sys.argv[1]))
