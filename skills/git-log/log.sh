#!/bin/bash
LIMIT=20
AUTHOR=""
SINCE=""
STATS=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --limit) LIMIT="$2"; shift 2 ;;
    --author) AUTHOR="$2"; shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    --stats) STATS=true; shift ;;
    *) shift ;;
  esac
done

CMD="git log --oneline -n $LIMIT"
[ -n "$AUTHOR" ] && CMD="git log --oneline -n $LIMIT --author=$AUTHOR"
[ -n "$SINCE" ] && CMD="git log --oneline -n $LIMIT --since=$SINCE"

if [ "$STATS" = true ]; then
  echo "=== Git Stats ==="
  git log --oneline --shortstat -n "$LIMIT" 2>/dev/null || echo "Not a git repository"
else
  echo "=== Git Log (last $LIMIT commits) ==="
  $CMD 2>/dev/null || echo "Not a git repository"
fi
