#!/bin/bash
DESCRIBE=""
QUERY=""
TABLE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --describe) DESCRIBE="$2"; shift 2 ;;
    --query) QUERY="$2"; shift 2 ;;
    --table) TABLE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -n "$DESCRIBE" ]; then
  echo "=== Generated SQL Schema ==="
  echo "-- Based on: $DESCRIBE"
  echo "CREATE TABLE IF NOT EXISTS items ("
  echo "  id SERIAL PRIMARY KEY,"
  echo "  name VARCHAR(255) NOT NULL,"
  echo "  created_at TIMESTAMP DEFAULT NOW()"
  echo ");"
elif [ -n "$QUERY" ]; then
  echo "=== Generated SQL Query ==="
  echo "-- Query: $QUERY"
  echo "-- Table: ${TABLE:-users}"
  echo "SELECT * FROM ${TABLE:-users} WHERE 1=1;"
  echo ""
  echo "Note: For complex queries, use the LLM-powered sql-generator skill."
else
  echo "Error: --describe or --query is required"
  exit 1
fi
