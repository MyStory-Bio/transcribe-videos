<!-- markdownlint-disable -->
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js web application that transcribes video files using Deepgram's AI Speech Recognition API. It features a drag-and-drop interface with real-time progress tracking and supports parallel processing of multiple videos.

## Commands

### Development
```bash
npm install              # Install all dependencies
npm run dev              # Start Next.js development server (http://localhost:3000)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

## Architecture

### Frontend (Next.js App Router)

- **app/page.tsx**: Main page that renders the VideoTranscriber component
- **app/components/VideoTranscriber.tsx**: React component with drag-and-drop interface
  - Multi-file upload with react-dropzone
  - Real-time progress bars with shimmer animations
  - Copy-to-clipboard functionality for transcriptions
  - Support for parallel file processing

### Backend (API Routes)

- **app/api/transcribe/route.ts**: POST endpoint to upload videos and start transcription jobs
  - Accepts FormData with video files
  - Generates unique job IDs
  - Processes videos asynchronously
  - Stores job state in memory (activeJobs Map)

- **app/api/progress/[jobId]/route.ts**: Server-Sent Events (SSE) endpoint for real-time progress
  - Streams progress updates every 500ms
  - Returns progress percentage, status, and results
  - Auto-cleans up completed jobs after 2 seconds

### Core Libraries

- **app/lib/ffmpeg-progress.ts**: FFmpeg wrapper using child_process
  - `FFmpegProgressTracker` class with EventEmitter
  - `processVideo()`: Converts video to WAV with real-time frame progress
  - `getTotalFrames()`: Gets video frame count for percentage calculation
  - Uses `-progress pipe:1` flag for frame-by-frame updates

### Dependencies

- **@deepgram/sdk**: Deepgram API client for transcription
- **ffmpeg-static**: Static FFmpeg binaries for audio extraction
- **react-dropzone**: Drag-and-drop file upload interface
- **next**: Next.js 15 framework with App Router
- **react**: React 19 for UI components
- **tailwindcss**: Utility-first CSS framework

## Processing Flow

1. User drops/selects video files in browser
2. Files uploaded to `/api/transcribe` endpoint
3. Server saves files to `/tmp` and creates job IDs
4. FFmpeg extracts audio with real-time progress tracking
5. Audio sent to Deepgram API for transcription
6. Client connects to `/api/progress/[jobId]` via SSE
7. Progress updates stream to browser (0-100%)
8. Transcription results displayed with copy button
9. Temp files cleaned up after completion

## Configuration

- **Environment Variables**: Create `.env.local` file:
  ```
  DEEPGRAM_API_KEY=your_api_key_here
  ```
- **Sample Video**: `deepgram.mp4` included for testing

## Important Notes

- Uses non-blocking child_process.spawn instead of execSync for FFmpeg
- Progress percentages calculated from actual FFmpeg frame counts
- Multiple videos process in parallel (Promise.allSettled)
- Server-Sent Events provide real-time updates without polling
- Temporary files stored in `/tmp` and cleaned up automatically
- Job state stored in-memory (not persistent across server restarts)