#!/bin/bash
echo "====================================="
echo "BẮT ĐẦU CẬP NHẬT SUNNY MANAGER..."
echo "====================================="

# Trở về thư mục gốc của project
cd /www/wwwroot/sunnymanager.com

echo "1. Đang kéo code mới nhất từ nhánh main..."
git pull origin main

echo "2. Đang cập nhật thư viện frontend..."
cd frontend
npm install --include=dev

echo "3. Đang build lại giao diện tĩnh..."
npm run build

echo "====================================="
echo "✅ CẬP NHẬT HOÀN TẤT THÀNH CÔNG!"
echo "====================================="
