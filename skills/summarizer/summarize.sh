#!/bin/bash
FILE=""
MAX_SENTENCES=10
while [[ $# -gt 0 ]]; do
  case $1 in
    --file) FILE="$2"; shift 2 ;;
    --max-sentences) MAX_SENTENCES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -n "$FILE" ] && [ -f "$FILE" ]; then
  TEXT=$(cat "$FILE")
elif [ ! -t 0 ]; then
  TEXT=$(cat)
else
  echo "Error: --file or stdin input required"
  exit 1
fi

ORIG_WORDS=$(echo "$TEXT" | wc -w)
ORIG_CHARS=$(echo "$TEXT" | wc -c)

echo "=== Summary ==="
echo "Original: $ORIG_WORDS words, $ORIG_CHARS chars"
echo ""

# Extract first sentence of each paragraph as key points
echo "$TEXT" | awk '
BEGIN { count=0; max='"$MAX_SENTENCES"' }
/^$/ { if (count > 0 && count < max) { print ""; next } }
/^[A-Z]/ && count < max { 
  line = $0
  if (length(line) > 200) line = substr(line, 1, 200) "..."
  print "- " line
  count++
}
' 

SUMMARY_WORDS=$(echo "$TEXT" | awk '
BEGIN { count=0; max='"$MAX_SENTENCES"'; words=0 }
/^[A-Z]/ && count < max { words += NF; count++ }
END { print words }
')
echo ""
echo "Summary: ~$SUMMARY_WORDS words (reduction: $((100 - SUMMARY_WORDS * 100 / (ORIG_WORDS + 1)))%)"
