#!/bin/bash
BASE_URL="http://localhost:5000/api"

echo "Kis email/password se login try kar rahe hain, wahi yahan daalein:"
echo ""
echo "Agar account pehle se nahi bana, pehle SIGNUP karein:"
echo 'curl -X POST '"$BASE_URL"'/auth/signup \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"name\":\"Admin\",\"email\":\"admin@admin.com\",\"password\":\"admin123\"}"'
echo ""
echo "Phir LOGIN try karein isi email/password se:"
echo 'curl -X POST '"$BASE_URL"'/auth/login \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"email\":\"admin@admin.com\",\"password\":\"admin123\"}"'
