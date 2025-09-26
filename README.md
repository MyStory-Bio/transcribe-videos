# Video Transcription App

A modern Next.js web application that transcribes video files using [Deepgram](https://deepgram.com)'s AI Speech Recognition API. Upload videos through a beautiful drag-and-drop interface and get real-time transcription results with progress tracking.

## Quick Start

Get up and running in 3 minutes:

```bash
# 1. Clone and install
git clone https://github.com/MyStory-Bio/transcribe-videos.git
cd transcribe-videos
pnpm install

# 2. Set up environment
echo "DEEPGRAM_API_KEY=your_deepgram_api_key_here" > .env.local

# 3. Run the app
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start transcribing videos! 🚀

> **Need a Deepgram API key?** Sign up at [deepgram.com](https://deepgram.com) and get free credits to get started.

## Features

- 🎥 **Multi-format Support**: Upload MP4, AVI, MOV, and other video formats
- 📁 **Drag & Drop Interface**: Intuitive file upload with visual feedback
- ⚡ **Real-time Progress**: Live progress tracking during video processing
- 🔄 **Batch Processing**: Upload and transcribe multiple videos simultaneously
- 🎯 **Advanced AI**: Uses Deepgram's Nova-3 model with smart formatting
- 📝 **Rich Transcripts**: Includes punctuation, utterances, paragraphs, and speaker diarization
- 🌙 **Dark Mode**: Beautiful dark/light theme support
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server-Sent Events
- **Video Processing**: FFmpeg for audio extraction
- **AI Transcription**: Deepgram Nova-3 model
- **File Handling**: React Dropzone for file uploads

## Detailed Setup

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Deepgram API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/transcribe-videos.git
cd transcribe-videos
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Deepgram API key to `.env.local`:
```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

4. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Videos**: Drag and drop video files onto the upload area or click to browse
2. **Start Processing**: Click "Start Transcription" to begin processing all uploaded files
3. **Monitor Progress**: Watch real-time progress bars as videos are processed
4. **View Results**: Read formatted transcripts with speaker identification and timestamps
5. **Export**: Copy transcripts or download them for further use

## API Endpoints

- `POST /api/transcribe` - Upload and start video transcription
- `GET /api/progress/[jobId]` - Stream real-time progress updates via Server-Sent Events

## Configuration

The app uses Deepgram's Nova-3 model with the following features enabled:
- Smart formatting
- Punctuation
- Utterances
- Paragraphs
- Speaker diarization

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `DEEPGRAM_API_KEY` environment variable in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Development

### Project Structure

```
app/
├── api/
│   ├── transcribe/route.ts      # Video upload and processing
│   └── progress/[jobId]/route.ts # Progress streaming
├── components/
│   ├── VideoTranscriber.tsx     # Main upload interface
│   └── TranscriptResult.tsx     # Transcript display
├── lib/
│   └── ffmpeg-progress.ts       # FFmpeg progress tracking
└── page.tsx                     # Home page
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Check the [Deepgram Documentation](https://developers.deepgram.com)
- Open an issue in this repository
- Contact Deepgram support for API-related questions
