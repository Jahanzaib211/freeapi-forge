#!/bin/bash

LANGUAGE=""
CODE=""
TIMEOUT=30

while [[ $# -gt 0 ]]; do
  case $1 in
    --language)
      LANGUAGE="$2"
      shift 2
      ;;
    --code)
      CODE="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -z "$LANGUAGE" ] || [ -z "$CODE" ]; then
  echo "Error: --language and --code are required"
  exit 1
fi

TMPFILE=$(mktemp)

case "$LANGUAGE" in
  python|py)
    echo "$CODE" > "${TMPFILE}.py"
    timeout "$TIMEOUT" python3 "${TMPFILE}.py"
    ;;
  javascript|js|node)
    echo "$CODE" > "${TMPFILE}.js"
    timeout "$TIMEOUT" node "${TMPFILE}.js"
    ;;
  bash|sh)
    echo "$CODE" > "${TMPFILE}.sh"
    chmod +x "${TMPFILE}.sh"
    timeout "$TIMEOUT" bash "${TMPFILE}.sh"
    ;;
  typescript|ts)
    echo "$CODE" > "${TMPFILE}.ts"
    timeout "$TIMEOUT" npx tsx "${TMPFILE}.ts"
    ;;
  *)
    echo "Error: Unsupported language '$LANGUAGE'. Supported: python, javascript, bash, typescript"
    rm -f "${TMPFILE}"*
    exit 1
    ;;
esac

rm -f "${TMPFILE}"*
