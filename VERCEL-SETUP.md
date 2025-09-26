# Vercel Setup - Quick Start

## ✅ Your App is Ready for Vercel!

Based on the official [Vercel Labs FFmpeg example](https://github.com/vercel-labs/ffmpeg-on-vercel), your application is properly configured.

## Configuration Files

### 1. `next.config.ts`
```typescript
experimental: {
  outputFileTracingIncludes: {
    "/api/transcribe": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
}
```
This ensures the FFmpeg binary is included in your serverless function bundle.

### 2. `vercel.json`
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
This allocates 3GB RAM and 5 minutes execution time for video processing.

### 3. API Route (`app/api/transcribe/route.ts`)
```typescript
export const maxDuration = 300;
```
Explicitly sets max duration for the transcription endpoint.

## Deploy to Vercel

1. **Add Environment Variable**:
   - Go to your Vercel project settings
   - Add: `DEEPGRAM_API_KEY=your_actual_key`

2. **Deploy**:
   ```bash
   vercel deploy
   ```

3. **Test**:
   - Upload a small video (< 50MB recommended for testing)
   - Watch the real-time progress
   - Copy the transcription

## Pricing Considerations

### Hobby Plan (Free)
- ❌ **Not suitable** - 10 second function timeout
- Video processing needs more time

### Pro Plan ($20/month)
- ✅ **Recommended** for production
- 300 second (5 minute) function timeout
- 3GB memory allocation
- Sufficient for most video transcription tasks

### Enterprise
- Custom limits
- Contact Vercel for pricing

## Performance Tips

1. **File Size**: Keep videos under 100MB for best results
2. **Duration**: Shorter videos (< 5 minutes) work best
3. **Concurrent Uploads**: The app supports parallel processing
4. **Cost Optimization**: FFmpeg is CPU-intensive; monitor usage

## Troubleshooting

### "FFmpeg binary not found" error
- This is normal during local development
- The binary is automatically included during Vercel builds
- Run `npm rebuild ffmpeg-static` for local testing

### Function timeout
- Videos taking > 5 minutes need optimization
- Consider splitting large videos
- Or use alternative platforms (Railway, Fly.io)

### Memory issues
- Increase memory in `vercel.json` (requires Pro plan)
- Maximum: 3008 MB on Pro plan

## Local Testing

```bash
# Install dependencies
npm install

# Rebuild FFmpeg binary for your platform
npm rebuild ffmpeg-static

# Start development server
npm run dev

# Open http://localhost:3000
```

## References

- [Vercel Labs FFmpeg Example](https://github.com/vercel-labs/ffmpeg-on-vercel)
- [Vercel Function Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Deepgram API Docs](https://developers.deepgram.com/)