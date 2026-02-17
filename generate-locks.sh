#!/bin/bash
# Run this ONCE before building Docker to generate package-lock.json files
# Then you can use npm ci in Docker for faster, reproducible builds

echo "Generating package-lock.json for backend..."
cd backend && npm install && cd ..

echo "Generating package-lock.json for frontend..."
cd frontend && npm install && cd ..

echo ""
echo "Done! Both package-lock.json files created."
echo "You can now build Docker with: docker build -t swiftly ."