#!/bin/bash
# Tests POST /api/expenses and POST /api/personal-expenses directly,
# bypassing the Android app - to confirm the backend itself works.

BASE_URL="http://localhost:5000/api"
EMAIL="admin@admin.com"
PASSWORD="admin123"

echo "1) Login..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

echo -e "\n2) Get a category id..."
curl -s -X GET "$BASE_URL/categories" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n3) Get your user id (copy 'id' from /me)..."
curl -s -X GET "$BASE_URL/auth/me" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n===> Now copy a categoryId and userId from above, then run:"
echo ""
echo 'curl -X POST '"$BASE_URL"'/expenses \'
echo '  -H "Authorization: Bearer '"$TOKEN"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"category\":\"PASTE_CATEGORY_ID\",\"date\":\"2026-07-16\",\"itemName\":\"Chawal\",\"price\":300,\"purchasedBy\":\"PASTE_USER_ID\"}"'
echo ""
echo 'curl -X POST '"$BASE_URL"'/personal-expenses \'
echo '  -H "Authorization: Bearer '"$TOKEN"'" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"date\":\"2026-07-16\",\"itemName\":\"Chai\",\"price\":50}"'
