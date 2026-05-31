#!/bin/bash

QUERY=""
LIMIT=5

while [[ $# -gt 0 ]]; do
  case $1 in
    --query)
      QUERY="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -z "$QUERY" ]; then
  echo "Error: --query is required"
  exit 1
fi

ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")

curl -s "https://html.duckduckgo.com/html/?q=${ENCODED_QUERY}" \
  -H "User-Agent: Mozilla/5.0" \
  | grep -oP 'class="result__snippet">[^<]+' \
  | head -n "$LIMIT" \
  | sed 's/class="result__snippet">//' \
  || echo "No results found for: $QUERY"
