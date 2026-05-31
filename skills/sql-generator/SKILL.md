# sql-generator

## Description

Generate SQL schema definitions and queries from table descriptions.

## Category

development

## Script

generate.sh

## Usage

```
./generate.sh --describe "users table with id, name, email, created_at"
./generate.sh --query "find all users who signed up in the last 30 days" --table users
```
