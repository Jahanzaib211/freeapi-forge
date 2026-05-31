#!/bin/bash
TEXT=""
TARGET_LANG="spanish"
while [[ $# -gt 0 ]]; do
  case $1 in
    --text) TEXT="$2"; shift 2 ;;
    --lang) TARGET_LANG="$2"; shift 2 ;;
    --file) TEXT=$(cat "$2"); shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$TEXT" ] && [ ! -t 0 ]; then
  TEXT=$(cat)
fi

if [ -z "$TEXT" ]; then
  echo "Error: --text or --file or stdin required"
  exit 1
fi

echo "=== Translation to $TARGET_LANG ==="
echo "Original ($(( $(echo "$TEXT" | wc -w) )) words):"
echo "$TEXT"
echo ""
echo "Note: For accurate translation, use the LLM-powered translator skill."
echo "This shell skill provides basic text transformation."
