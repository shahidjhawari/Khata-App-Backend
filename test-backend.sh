#!/bin/bash
# Quick sanity check for the Expense Manager backend.
# Usage: ./test-backend.sh   (edit BASE_URL if backend is not on localhost:5000)

BASE_URL="http://localhost:5000/api"
EMAIL="admin@admin.com"
PASSWORD="admin123"

echo "1) Signing up / logging in as admin..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$LOGIN_RES"

TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "!! Could not get a token. Fix login first (check email/password/DB) before testing further."
  exit 1
fi

echo -e "\n2) Token acquired. Testing GET /api/personal-expenses..."
curl -s -X GET "$BASE_URL/personal-expenses" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n3) Testing GET /api/payments..."
curl -s -X GET "$BASE_URL/payments" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n4) Testing GET /api/archive..."
curl -s -X GET "$BASE_URL/archive" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n5) Testing GET /api/categories (need at least one category id for step 6)..."
curl -s -X GET "$BASE_URL/categories" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n6) To test adding an expense, run manually with a real category id and user id:"
echo 'curl -X POST '"$BASE_URL"'/expenses \'
echo '  -H "Authorization: Bearer '"$TOKEN"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"category\":\"<CATEGORY_ID>\",\"date\":\"2026-07-16\",\"itemName\":\"Milk\",\"price\":250,\"purchasedBy\":\"<USER_ID>\"}"'
