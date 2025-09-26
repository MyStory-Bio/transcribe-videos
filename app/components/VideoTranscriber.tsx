'use client';
import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import TranscriptResult from './TranscriptResult';

interface FileJob {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: string;
  rawResult?: unknown;
}

export default function VideoTranscriber() {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const newJobs = acceptedFiles.map(file => ({
      id: `temp_${Date.now()}_${Math.random()}`,
      file,
      progress: 0,
      status: 'pending' as const,
      rawResult: undefined
    }));
    setJobs(prev => [...prev, ...newJobs]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: true
  });

  const startProcessing = async () => {
    setIsProcessing(true);

    const pendingJobs = jobs.filter(job => job.status === 'pending');

    const jobPromises = pendingJobs.map(async (job) => {
      try {
        const formData = new FormData();
        formData.append('file', job.file);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });

        const { jobId } = await response.json();

        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, id: jobId, status: 'processing' } : j
        ));

        const eventSource = new EventSource(`/api/progress/${jobId}`);

        eventSource.onmessage = (event) => {
          const progressData = JSON.parse(event.data);

          setJobs(prev => prev.map(j => {
            if (j.id === jobId) {
              return {
                ...j,
                progress: progressData.progress,
                status: progressData.status,
                result: progressData.result || undefined,
                rawResult: progressData.rawResult
              };
            }
            return j;
          }));

          if (progressData.status === 'complete' || progressData.status === 'error') {
            eventSource.close();
          }
        };

        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            return;
          }

          eventSource.close();
          setJobs(prev => prev.map(j =>
            j.id === jobId && j.status === 'processing'
              ? { ...j, status: 'error' }
              : j
          ));
        };

      } catch {
        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'error' } : j
        ));
      }
    });

    await Promise.allSettled(jobPromises);
    setIsProcessing(false);
  };

  const clearAll = () => {
    setJobs([]);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Video Transcription</h1>
        <p className="text-gray-600 dark:text-gray-400">Upload videos and get AI-powered transcriptions</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          <div className="text-5xl">📁</div>
          <p className="text-xl font-medium">
            {isDragActive ? 'Drop files here...' : 'Drop video files here or click to browse'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supports MP4, AVI, MOV, and more • Multiple files allowed
          </p>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Files ({jobs.length})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={startProcessing}
                disabled={isProcessing || !jobs.some(j => j.status === 'pending')}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors font-medium"
              >
                {isProcessing ? 'Processing...' : 'Start Transcription'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-lg">
                      {job.file.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(job.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      job.status === 'complete' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      job.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                      job.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {job.status === 'processing' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Processing video...</span>
                      <span className="font-semibold">{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                        style={{ width: `${job.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                )}

                {job.status === 'complete' && job.result && job.result.trim().length > 0 && (
                  <TranscriptResult
                    transcript={job.result}
                    rawResult={job.rawResult}
                    fileName={job.file.name}
                  />
                )}


                {job.status === 'error' && (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    ⚠️ Transcription failed. Please try again.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
