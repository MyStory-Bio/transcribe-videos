import { NextRequest, NextResponse } from 'next/server';
import { FFmpegProgressTracker } from '@/app/lib/ffmpeg-progress';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@deepgram/sdk';

export const maxDuration = 300;

interface JobData {
  tracker: FFmpegProgressTracker;
  progress: number;
  status: 'processing' | 'complete' | 'error';
  fileName: string;
  result: string | null;
  rawResult: unknown | null;
}

export const activeJobs = new Map<string, JobData>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tempDir = '/tmp';
    const inputPath = join(tempDir, `${jobId}_input_${file.name}`);
    const audioPath = join(tempDir, `${jobId}_audio.wav`);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(inputPath, buffer);

    // Create job entry BEFORE starting async processing to avoid race condition
    activeJobs.set(jobId, {
      tracker: new FFmpegProgressTracker(),
      progress: 0,
      status: 'processing',
      fileName: file.name,
      result: null,
      rawResult: null
    });


    processVideoAsync(jobId, inputPath, audioPath);

    return NextResponse.json({ jobId, fileName: file.name });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}

async function processVideoAsync(jobId: string, inputPath: string, audioPath: string) {
  try {
    const job = activeJobs.get(jobId);
    if (!job) {
      return;
    }

    const tracker = job.tracker;
    const totalFrames = await tracker.getTotalFrames(inputPath);

    tracker.on('progress', (progressData) => {
      const currentJob = activeJobs.get(jobId);
      if (currentJob) {
        currentJob.progress = progressData.percent;
        currentJob.status =
          progressData.status === 'complete' ? 'processing' : progressData.status;
      }
    });

    await tracker.processVideo(inputPath, audioPath, totalFrames);

    const audioBuffer = readFileSync(audioPath);

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }

    const deepgram = createClient(apiKey);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
      }
    );

    const transcription = result?.results?.channels[0]?.alternatives[0]?.transcript || '';

    const completedJob = activeJobs.get(jobId);
    if (completedJob) {
      completedJob.result = transcription;
      completedJob.rawResult = result;
      completedJob.status = 'complete';
      completedJob.progress = 100;
    }

    unlinkSync(inputPath);
    unlinkSync(audioPath);

  } catch {
    const job = activeJobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.progress = 0;
    }
  }
}
