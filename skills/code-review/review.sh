#!/bin/bash
FILE=""
CODE=""
LANGUAGE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --file) FILE="$2"; shift 2 ;;
    --code) CODE="$2"; shift 2 ;;
    --language) LANGUAGE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -n "$FILE" ] && [ -f "$FILE" ]; then
  CODE=$(cat "$FILE")
  LANGUAGE="${FILE##*.}"
fi

if [ -z "$CODE" ]; then
  echo "Error: --file or --code is required"
  exit 1
fi

echo "=== Code Review ==="
echo "Language: ${LANGUAGE:-auto-detected}"
echo "Lines: $(echo "$CODE" | wc -l)"
echo ""

# Security checks
echo "## Security Issues"
echo "$CODE" | grep -n "eval\|exec\|system\|subprocess\|os\.system\|child_process\|__import__" | while read line; do
  echo "  ⚠️  SECURITY: Potentially dangerous call at: $line"
done
echo "$CODE" | grep -n "password\|secret\|token\|api_key\|apikey" | grep -iv "#" | while read line; do
  echo "  🔑 SECRET: Possible hardcoded secret at: $line"
done

# Style checks
echo ""
echo "## Style Issues"
LONG_LINES=$(echo "$CODE" | awk 'length > 120 {print NR": line too long ("length" chars)"}')
if [ -n "$LONG_LINES" ]; then
  echo "$LONG_LINES" | head -5 | while read line; do
    echo "  📏 STYLE: $line"
  done
fi

# Complexity
echo ""
echo "## Metrics"
echo "  Lines of code: $(echo "$CODE" | wc -l)"
echo "  Functions: $(echo "$CODE" | grep -cE 'def |function |func |fn |=>' || echo 0)"
echo "  Comments: $(echo "$CODE" | grep -cE '^\s*#|^\s*//|^\s*/\*' || echo 0)"
echo "  Imports: $(echo "$CODE" | grep -cE 'import |require\(|from ' || echo 0)"
