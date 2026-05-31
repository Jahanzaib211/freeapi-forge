#!/bin/bash
FILE=""
PRETTY=false
KEYS=false
VALIDATE=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --file) FILE="$2"; shift 2 ;;
    --pretty) PRETTY=true; shift ;;
    --keys) KEYS=true; shift ;;
    --validate) VALIDATE=true; shift ;;
    *) shift ;;
  esac
done

if [ -n "$FILE" ] && [ -f "$FILE" ]; then
  INPUT=$(cat "$FILE")
elif [ ! -t 0 ]; then
  INPUT=$(cat)
else
  echo "Error: --file or stdin input required"
  exit 1
fi

if [ "$VALIDATE" = true ]; then
  echo "$INPUT" | python3 -m json.tool > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Valid JSON"
  else
    echo "❌ Invalid JSON"
    exit 1
  fi
elif [ "$PRETTY" = true ]; then
  echo "$INPUT" | python3 -m json.tool
elif [ "$KEYS" = true ]; then
  echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(d.keys()) if isinstance(d,dict) else 'Not an object')"
else
  echo "$INPUT" | python3 -m json.tool 2>/dev/null || echo "$INPUT"
fi
