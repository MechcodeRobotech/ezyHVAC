# 🚀 ezyHVAC Deployment Guide

## 📋 Overview
This guide explains how to deploy both Frontend and Backend of ezyHVAC application.

## 🏗️ Architecture
- **Frontend**: React + Vite (Static Site)
- **Backend**: FastAPI + Python (API Server)
- **Database**: MongoDB Atlas

## 🌐 Frontend Deployment

### GitHub Pages (Current)
```bash
# Build for production
npm run build

# Files are built to `dist/` directory
# GitHub Pages serves from this directory
```

### Environment Variables
- **Development**: Uses `http://localhost:8000`
- **Staging**: Uses `https://staging-api.ezyhvac.com`  
- **Production**: Uses `https://api.ezyhvac.com`

## 🔧 Backend Deployment Options

### Option 1: Railway.app (Recommended)
1. Sign up at [Railway.app](https://railway.app/)
2. Connect GitHub repository
3. Set environment variables:
   ```
   MONGO_DETAILS=mongodb+srv://...
   ALLOWED_ORIGINS=https://mechcoderobotech.github.io,https://ezyhvac.com
   ```

### Option 2: Heroku
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create ezyhvac-api

# Set environment variables
heroku config:set MONGO_DETAILS="mongodb+srv://..."
heroku config:set ALLOWED_ORIGINS="https://mechcoderobotech.github.io,https://ezyhvac.com"

# Deploy
git subtree push --prefix Backend heroku main
```

### Option 3: DigitalOcean App Platform
1. Connect GitHub repository
2. Select `Backend/` folder as source
3. Set environment variables in dashboard

### Option 4: AWS Lambda + API Gateway
- Use Mangum adapter for FastAPI
- Deploy with AWS SAM or Serverless Framework

## 🔄 Automatic Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build
        env:
          VITE_API_BASE_URL: https://api.ezyhvac.com
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: railwayapp/railway-deploy-action@v2
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ezyhvac-api
```

## 🌍 Custom Domain Setup

### Frontend (GitHub Pages)
1. Add `CNAME` file to `public/` directory:
   ```
   ezyhvac.com
   ```

2. Configure DNS:
   ```
   Type: CNAME
   Name: www
   Value: mechcoderobotech.github.io
   ```

### Backend API
1. Get deployment URL from hosting service
2. Add CNAME record:
   ```
   Type: CNAME  
   Name: api
   Value: your-backend-deployment.railway.app
   ```

## 🔐 Environment Variables Setup

### Backend (.env)
```bash
MONGO_DETAILS=mongodb+srv://admin1:password@cluster.mongodb.net/?retryWrites=true&w=majority
ALLOWED_ORIGINS=https://ezyhvac.com,https://www.ezyhvac.com,https://mechcoderobotech.github.io
```

### Frontend Environment Files
- `.env.development` - Local development
- `.env.staging` - Testing environment  
- `.env.production` - Live website

## 📝 Deployment Checklist

### Before Deployment:
- [ ] Backend API is deployed and accessible
- [ ] MongoDB connection is working
- [ ] CORS origins are configured correctly
- [ ] Frontend environment variables point to correct API URL
- [ ] All dependencies are installed
- [ ] Build process completes without errors

### After Deployment:
- [ ] Frontend loads successfully
- [ ] API endpoints are accessible
- [ ] Image upload and processing works
- [ ] SEER calculations function properly
- [ ] Database operations complete successfully

## 🐛 Troubleshooting

### API Connection Issues
1. Check browser console for CORS errors
2. Verify API URL in environment variables
3. Test API endpoint directly: `https://api.ezyhvac.com/docs`
4. Confirm backend deployment status

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check environment variables
echo $VITE_API_BASE_URL

# Build with verbose logging
npm run build -- --debug
```

## 📞 Support
For deployment assistance, check the deployment logs and console errors first.