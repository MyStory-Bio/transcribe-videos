import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import ffmpegStatic from 'ffmpeg-static';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface ProgressData {
  frame: number;
  fps: number;
  percent: number;
  timeElapsed: string;
  status: 'processing' | 'complete' | 'error';
}

function getFfmpegPath(): string {
  if (!ffmpegStatic) {
    throw new Error('FFmpeg binary path not available from ffmpeg-static package');
  }

  // Resolve the path to handle pnpm and other package managers
  const resolvedPath = ffmpegStatic.startsWith('/ROOT/')
    ? resolve(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg')
    : ffmpegStatic;

  if (!existsSync(resolvedPath)) {
    console.warn(`FFmpeg binary not found at: ${resolvedPath}`);
    console.warn('Trying alternative paths...');

    // Try alternative paths for different package managers
    const alternatives = [
      resolve(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg'),
      resolve(process.cwd(), 'node_modules/.pnpm/ffmpeg-static@5.2.0/node_modules/ffmpeg-static/ffmpeg'),
    ];

    for (const altPath of alternatives) {
      if (existsSync(altPath)) {
        console.log(`Found FFmpeg at: ${altPath}`);
        return altPath;
      }
    }

    throw new Error(`FFmpeg binary not found. Tried: ${resolvedPath}, ${alternatives.join(', ')}`);
  }

  return resolvedPath;
}

export class FFmpegProgressTracker extends EventEmitter {
  async processVideo(inputPath: string, outputPath: string, totalFrames?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let ffmpegPath: string;

      try {
        ffmpegPath = getFfmpegPath();
      } catch (error) {
        reject(error);
        return;
      }

      const ffmpeg = spawn(ffmpegPath, [
        '-progress', 'pipe:1',
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        outputPath,
        '-y'
      ]);

      let currentFrame = 0;
      let buffer = '';

      ffmpeg.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('frame=')) {
            currentFrame = parseInt(line.split('=')[1]);
          }

          if (line.startsWith('progress=')) {
            const status = line.split('=')[1].trim();

            if (status === 'continue' && totalFrames) {
              const percent = Math.round((currentFrame / totalFrames) * 100);

              this.emit('progress', {
                frame: currentFrame,
                percent: Math.min(percent, 99),
                fps: 0,
                timeElapsed: '',
                status: 'processing'
              } as ProgressData);
            }

            if (status === 'end') {
              this.emit('progress', {
                frame: currentFrame,
                percent: 100,
                fps: 0,
                timeElapsed: '',
                status: 'complete'
              } as ProgressData);
            }
          }
        }
      });

      ffmpeg.stderr.on('data', (data) => {
        console.error(`FFmpeg stderr: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          this.emit('progress', {
            percent: 0,
            status: 'error',
            frame: 0,
            fps: 0,
            timeElapsed: ''
          } as ProgressData);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.emit('progress', {
          percent: 0,
          status: 'error',
          frame: 0,
          fps: 0,
          timeElapsed: ''
        } as ProgressData);
        reject(error);
      });
    });
  }

  async getTotalFrames(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      let ffmpegPath: string;

      try {
        ffmpegPath = getFfmpegPath();
      } catch (error) {
        console.error('FFmpeg not available, using default frame count:', error);
        resolve(1000);
        return;
      }

      const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');

      if (!existsSync(ffprobePath)) {
        console.warn('FFprobe not found, using default frame count');
        resolve(1000);
        return;
      }

      const ffprobe = spawn(ffprobePath, [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-count_frames',
        '-show_entries', 'stream=nb_read_frames',
        '-of', 'csv=p=0',
        videoPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        console.error(`FFprobe stderr: ${data}`);
      });

      ffprobe.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const frames = parseInt(output.trim());
          resolve(frames || 1000);
        } else {
          resolve(1000);
        }
      });

      ffprobe.on('error', () => {
        resolve(1000);
      });
    });
  }
}