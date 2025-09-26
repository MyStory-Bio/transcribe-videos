# Deployment Guide

## Running Locally

This application works perfectly when running locally:

```bash
npm install
npm run dev
```

Set your `DEEPGRAM_API_KEY` in `.env.local`:
```
DEEPGRAM_API_KEY=your_key_here
```

## Deploying to Vercel ✅

**Good News**: This application is fully configured to work on Vercel!

### Configuration

The project includes the necessary Vercel configuration:

**1. `next.config.ts`** - Includes FFmpeg binary in build:
```typescript
experimental: {
  outputFileTracingIncludes: {
    "/api/transcribe": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
}
```

**2. `vercel.json`** - Optimizes function resources:
```json
{
  "functions": {
    "app/api/transcribe/route.ts": {
      "memory": 3008,
      "maxDuration": 300
    }
  }
}
```

### Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `DEEPGRAM_API_KEY`

3. **Deploy**:
   - Vercel will automatically build and deploy
   - FFmpeg binary will be included via `outputFileTracingIncludes`

### Important Notes

- **Memory**: Configured for 3GB RAM (requires Pro plan for higher memory)
- **Duration**: Max 300 seconds (5 minutes) - requires Pro plan
- **Cost**: FFmpeg is CPU-intensive; consider using Vercel Pro for production
- **Free Tier**: Limited to 10 seconds execution time (not sufficient for video processing)

### Pro Plan Required

For production video processing on Vercel, you'll need:
- **Vercel Pro** ($20/month per member)
  - Up to 300s function duration
  - 3GB memory allocation
  - Better for CPU-intensive workloads

## Alternative Platforms

If Vercel Pro is not an option, consider:

- **Railway**: $5/month with generous limits
- **Fly.io**: Pay-per-use with FFmpeg support
- **DigitalOcean App Platform**: $5-12/month
- **AWS Lambda** with FFmpeg layer

## Architecture Notes

This application uses:
- **FFmpeg** via `ffmpeg-static` for audio extraction
- **Deepgram API** for transcription
- **Server-Sent Events** for real-time progress
- **In-memory storage** for job tracking (not persistent across deployments)