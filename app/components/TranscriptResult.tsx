'use client';
import { useState } from 'react';

interface TranscriptResultProps {
  transcript: string;
  rawResult?: unknown;
  fileName: string;
  onCopy?: () => void;
}

export default function TranscriptResult({ transcript, rawResult, fileName, onCopy }: TranscriptResultProps) {
  const [copied, setCopied] = useState(false);
  const hasRawResult = rawResult !== undefined && rawResult !== null;
  const rawJson = hasRawResult ? JSON.stringify(rawResult, null, 2) : '';

  const formatTime = (value: unknown) => {
    const seconds = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(seconds)) {
      return '00:00';
    }
    const totalSeconds = Math.max(0, seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 10);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${tenths ? `.${tenths}` : ''}`;
  };

  const buildTimestampedTranscript = () => {
    if (!hasRawResult) {
      return transcript;
    }

    const resultAny = rawResult as Record<string, unknown>;
    const results = resultAny?.results as Record<string, unknown> | undefined;
    const channels = results?.channels as unknown[] | undefined;
    const altObj = channels?.[0] as Record<string, unknown> | undefined;
    const paragraphs = altObj?.paragraphs as Record<string, unknown> | undefined;
    const paragraphData = paragraphs?.paragraphs;

    if (Array.isArray(paragraphData) && paragraphData.length > 0) {
      const lines: string[] = [];
      paragraphData.forEach((para) => {
        if (!para || typeof para !== 'object') {
          return;
        }
        const sentences = (para as Record<string, unknown>).sentences;
        if (!Array.isArray(sentences)) {
          return;
        }
        sentences.forEach((sentence) => {
          if (!sentence || typeof sentence !== 'object') {
            return;
          }
          const { start, text } = sentence as { start?: number; text?: string };
          if (!text) {
            return;
          }
          lines.push(`[${formatTime(start)}] ${text.trim()}`);
        });
      });

      if (lines.length > 0) {
        return lines.join('\n');
      }
    }

    const words = altObj?.words as unknown[] | undefined;
    if (Array.isArray(words) && words.length > 0) {
      const lines: string[] = [];
      let currentWords: string[] = [];
      let lineStart: number | undefined;

      words.forEach((wordEntry, index) => {
        if (!wordEntry || typeof wordEntry !== 'object') {
          return;
        }
        const { start, punctuated_word, word } = wordEntry as {
          start?: number;
          punctuated_word?: string;
          word?: string;
        };
        if (currentWords.length === 0) {
          lineStart = start;
        }
        const displayWord = punctuated_word || word || '';
        currentWords.push(displayWord);

        const isSentenceBoundary = /[.!?]$/.test(displayWord);
        const isLastWord = index === words.length - 1;

        if (isSentenceBoundary || isLastWord) {
          const segmentText = currentWords.join(' ').replace(/\s+/g, ' ').trim();
          lines.push(`[${formatTime(lineStart)}] ${segmentText}`);
          currentWords = [];
        }
      });

      if (lines.length > 0) {
        return lines.join('\n');
      }
    }

    return transcript;
  };

  const timestampedTranscript = buildTimestampedTranscript();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(timestampedTranscript);
      setCopied(true);
      onCopy?.();
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([timestampedTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyRawJson = async () => {
    if (!hasRawResult) {
      return;
    }
    try {
      await navigator.clipboard.writeText(rawJson);
    } catch (err) {
      console.error('Failed to copy JSON: ', err);
    }
  };

  const downloadRawJson = () => {
    if (!hasRawResult) {
      return;
    }
    const blob = new Blob([rawJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_deepgram.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Transcription for {fileName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transcript.length} characters • {transcript.split(' ').length} words
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={downloadTranscript}
            className="px-3 py-1.5 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors font-medium"
          >
            💾 Download
          </button>
          {hasRawResult && (
            <>
              <button
                onClick={copyRawJson}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 transition-colors font-medium"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={downloadRawJson}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-colors font-medium"
              >
                💾 Download JSON
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="relative">
        <textarea
          value={timestampedTranscript}
          readOnly
          className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
          placeholder="Transcription will appear here..."
        />
        <div className="absolute top-2 right-2">
          <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            Read-only
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>📝 Generated by Deepgram AI</span>
          <span>⏱️ {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Select all: </span>
          <button
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              textarea?.select();
            }}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Ctrl+A
          </button>
        </div>
      </div>

    </div>
  );
}
