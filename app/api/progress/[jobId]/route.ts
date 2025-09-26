import { NextRequest } from 'next/server';
import { activeJobs } from '../../transcribe/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProgressStatus = 'processing' | 'complete' | 'error';

interface ProgressData {
  progress: number;
  status: ProgressStatus;
  fileName: string;
  result?: string;
  rawResult?: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  let cleanup: (() => void) | undefined;
  let intervalId: NodeJS.Timeout | undefined;
  let abortHandler: (() => void) | undefined;
  let completionTimer: NodeJS.Timeout | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const sendProgress = (data: ProgressData) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('SSE enqueue error:', err);
        }
      };

      const closeStream = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        if (completionTimer) {
          clearTimeout(completionTimer);
          completionTimer = undefined;
        }
        if (abortHandler) {
          request.signal.removeEventListener('abort', abortHandler);
          abortHandler = undefined;
        }
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      };

      cleanup = closeStream;

      const publishCurrentState = () => {
        const currentJob = activeJobs.get(jobId);

        if (!currentJob) {
          closeStream();
          return;
        }

        sendProgress({
          progress: currentJob.progress,
          status: currentJob.status,
          fileName: currentJob.fileName,
          result: currentJob.result ?? undefined,
          rawResult: currentJob.rawResult ?? undefined,
        });

        const isTerminal =
          currentJob.status === 'error' ||
          (currentJob.status === 'complete' && !!currentJob.result);

        if (isTerminal && !completionTimer) {
          completionTimer = setTimeout(() => {
            activeJobs.delete(jobId);
            closeStream();
          }, 2000);
        }
      };

      // Send initial snapshot immediately
      publishCurrentState();

      intervalId = setInterval(publishCurrentState, 500);

      abortHandler = () => {
        closeStream();
      };
      request.signal.addEventListener('abort', abortHandler);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
