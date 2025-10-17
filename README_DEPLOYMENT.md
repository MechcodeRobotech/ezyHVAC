# ezyHVAC - SEER Calculator

A web application for HVAC SEER (Seasonal Energy Efficiency Ratio) calculations.

## Features

- SEER calculation for Fixed and Variable capacity systems
- Temperature data analysis
- Image-based measurement analysis
- File upload and management
- MongoDB integration for data storage

## Backend API Endpoints

- `GET /` - API information and status
- `GET /health` - Health check
- `POST /calculate-seer` - Full SEER calculation with file upload
- `POST /calculate-seer-simple` - Simple SEER calculation (no file required)
- `POST /calculate-seer-range-summary` - SEER calculation summary over temperature ranges
- `POST /api/measure-image` - Image measurement analysis
- `POST /api/files/upload` - File upload
- `GET /api/files` - List uploaded files

## Deployment to Vercel

### Prerequisites
1. Vercel account
2. MongoDB Atlas account (for database)

### Steps

1. **Set up MongoDB Atlas:**
   - Create a MongoDB Atlas cluster
   - Get the connection string
   - Whitelist Vercel IP addresses

2. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel --prod
   ```

3. **Set Environment Variables in Vercel:**
   - Go to your project in Vercel dashboard
   - Go to Settings > Environment Variables
   - Add the following:
     - `MONGO_DETAILS`: Your MongoDB connection string
     - `ENVIRONMENT`: `production`

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# MongoDB Connection String
MONGO_DETAILS=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Environment
ENVIRONMENT=production

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.vercel.app,https://yourdomain.com
```

## Local Development

1. **Install dependencies:**
   ```bash
   cd Backend
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run the server:**
   ```bash
   uvicorn app:app --reload --port 8000
   ```

4. **Access the API:**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

## Frontend

The frontend is built with React/Vite and can be deployed separately to Vercel.

## Troubleshooting

### Common Issues on Vercel:

1. **"No calculation" or empty responses:**
   - Check if MongoDB environment variable is set correctly
   - Use `/calculate-seer-simple` endpoint for testing without database
   - Check Vercel function logs

2. **CORS errors:**
   - Ensure your frontend domain is added to ALLOWED_ORIGINS
   - Check CORS middleware configuration

3. **Import errors:**
   - Make sure all dependencies are in requirements.txt
   - Use `opencv-python-headless` instead of `opencv-python`

4. **Timeout errors:**
   - Vercel has a 10-second timeout for serverless functions
   - Consider optimizing calculations or using background jobs

### Testing the API:

You can test the simple calculation endpoint without database:

```bash
curl -X POST "https://your-app.vercel.app/calculate-seer-simple" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "mode=Fixed&bin_temp=25&time_range=09.00-18.00&Coil_inlet_wet_bulb=20&Coil_inlet_dry_bulb=35&full_Capacity=5000&p_full=1500&Designcoolingload=4000&electricity_rate=0.12&working_day_per_year=250"
```

## License

MIT License