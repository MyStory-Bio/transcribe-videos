'use client';
import { useState, useMemo } from 'react';
import { Check, Copy, Download, FileJson } from 'lucide-react';

type TranscriptMode = 'speaker' | 'segments' | 'plain';

interface TranscriptResultProps {
  transcript: string;
  rawResult?: unknown;
  fileName: string;
}

export default function TranscriptResult({ transcript, rawResult, fileName }: TranscriptResultProps) {
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { text: formattedTranscript, mode: transcriptMode } = useMemo<{ text: string; mode: TranscriptMode }>(() => {
    if (!rawResult) {
      return { text: transcript, mode: 'plain' };
    }

    type DeepgramWord = {
      start: number;
      end?: number;
      word: string;
      punctuated_word?: string;
      speaker?: number | string;
    };

    type DeepgramUtterance = {
      start: number;
      end: number;
      channel?: number;
      speaker?: number | string | null;
      transcript: string;
      words?: DeepgramWord[];
    };

    type Turn = {
      start: number;
      end: number;
      text: string;
      speakerLabel: string;
      speakerKey: string;
      mode: Exclude<TranscriptMode, 'plain'>;
      words?: DeepgramWord[];
    };

    const resolveSpeakerLabel = (speaker: number | string | null | undefined): string => {
      if (speaker === null || speaker === undefined) {
        return 'Speaker';
      }

      if (typeof speaker === 'number') {
        return `Speaker ${speaker + 1}`;
      }

      const normalized = speaker.toString().trim();
      if (!normalized) {
        return 'Speaker';
      }

      const numericMatch = normalized.match(/(\d+)/);
      if (numericMatch) {
        const numericValue = Number(numericMatch[1]);
        if (!Number.isNaN(numericValue)) {
          return `Speaker ${numericValue >= 0 ? numericValue + 1 : numericValue}`;
        }
      }

      return normalized.replace(/^speaker[_-]?/i, 'Speaker ').trim() || 'Speaker';
    };

    const resolveSpeakerKey = (speaker: number | string | null | undefined, channel?: number): string => {
      const speakerValue = speaker === null || speaker === undefined ? 'unknown' : String(speaker);
      return `${channel ?? 'ch0'}|${speakerValue}`;
    };

    const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

    const mergeTurns = (first: Turn, second: Turn): Turn => {
      const mergedText = normalizeWhitespace(`${first.text} ${second.text}`);
      const mergedWords = [
        ...(first.words ?? []),
        ...(second.words ?? []),
      ];

      return {
        ...first,
        end: Math.max(first.end, second.end),
        text: mergedText,
        words: mergedWords.length > 0 ? mergedWords : undefined,
      };
    };

    const enforceNoTrailingCommas = (turns: Turn[]): Turn[] => {
      const cleaned: Turn[] = [];

      for (let i = 0; i < turns.length; i++) {
        let current: Turn = {
          ...turns[i],
          text: turns[i].text.trim(),
          words: turns[i].words ? [...turns[i].words] : undefined,
        };

        while (current.text.endsWith(',')) {
          const next = turns[i + 1];
          if (
            next &&
            next.mode === current.mode &&
            next.speakerKey === current.speakerKey
          ) {
            current = mergeTurns(current, {
              ...next,
              text: next.text.trim(),
              words: next.words ? [...next.words] : undefined,
            });
            i += 1;
            continue;
          }

          current = {
            ...current,
            text: `${current.text} (continued)`,
          };
          break;
        }

        current = {
          ...current,
          text: normalizeWhitespace(current.text),
        };

        cleaned.push(current);
      }

      return cleaned;
    };

    const utterances = (rawResult as { results?: { utterances?: DeepgramUtterance[] } })?.results?.utterances ?? [];

    const speakerTurns: Turn[] = utterances
      .filter((utterance): utterance is DeepgramUtterance => {
        return typeof utterance?.start === 'number' && typeof utterance?.end === 'number';
      })
      .map((utterance) => {
        const text = normalizeWhitespace(utterance.transcript ?? '');
        return {
          start: utterance.start,
          end: utterance.end,
          text,
          speakerLabel: resolveSpeakerLabel(utterance.speaker),
          speakerKey: resolveSpeakerKey(utterance.speaker, utterance.channel),
          mode: 'speaker' as const,
          words: utterance.words ? [...utterance.words] : undefined,
        };
      })
      .filter((turn) => turn.text.length > 0);

    if (speakerTurns.length > 0) {
      const cleanedTurns = enforceNoTrailingCommas(speakerTurns);
      const formatted = cleanedTurns.map((turn) => {
        const startTs = formatTimestamp(turn.start);
        const endTs = formatTimestamp(turn.end);
        return `[${startTs} - ${endTs}] ${turn.speakerLabel}: ${turn.text}`;
      });

      if (formatted.length > 0) {
        return { text: formatted.join('\n'), mode: 'speaker' };
      }
    }

    const words = (rawResult as { results?: { channels?: { alternatives?: { words?: DeepgramWord[] }[] }[] } })?.results?.channels?.[0]?.alternatives?.[0]?.words;

    if (words && Array.isArray(words) && words.length > 0) {
      const SEGMENT_DURATION = 4; // seconds
      const segments: Turn[] = [];

      let currentSegment: Turn | null = null;

      const pushCurrentSegment = () => {
        if (currentSegment && currentSegment.text.trim().length > 0) {
          const normalizedText = normalizeWhitespace(currentSegment.text);
          segments.push({
            ...currentSegment,
            text: normalizedText,
            words: currentSegment.words ? [...currentSegment.words] : undefined,
          });
        }
        currentSegment = null;
      };

      words.forEach((word, index) => {
        const displayWordRaw = word.punctuated_word ?? word.word;
        const displayWord = displayWordRaw ? normalizeWhitespace(displayWordRaw) : '';

        if (!displayWord) {
          return;
        }

        const wordStart = word.start;
        const wordEnd = word.end ?? word.start;

        if (!currentSegment) {
          currentSegment = {
            start: wordStart,
            end: wordEnd,
            text: displayWord,
            speakerLabel: 'Segment',
            speakerKey: 'segment',
            mode: 'segments',
            words: [word],
          };
          return;
        }

        currentSegment.text = `${currentSegment.text} ${displayWord}`;
        currentSegment.end = wordEnd;
        currentSegment.words = [...(currentSegment.words ?? []), word];

        const nextWord = words[index + 1];
        const nextWordStart = nextWord?.start ?? currentSegment.end;
        const elapsed = nextWordStart - currentSegment.start;
        const shouldClose = !nextWord || elapsed >= SEGMENT_DURATION;

        if (shouldClose) {
          pushCurrentSegment();
        }
      });

      // Flush remaining segment if any
      pushCurrentSegment();

      if (segments.length > 0) {
        const cleanedSegments = enforceNoTrailingCommas(segments);
        const formattedSegments = cleanedSegments.map((segment) => {
          const startTs = formatTimestamp(segment.start);
          return `[${startTs}] ${segment.text}`;
        });

        if (formattedSegments.length > 0) {
          return { text: formattedSegments.join('\n'), mode: 'segments' };
        }
      }
    }

    return { text: transcript, mode: 'plain' };
  }, [transcript, rawResult]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedTranscript);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([formattedTranscript], { type: 'text/plain' });
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
    if (!rawResult) return;
    try {
      const jsonString = JSON.stringify(rawResult, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON: ', err);
    }
  };

  const downloadRawJson = () => {
    if (!rawResult) return;
    const jsonString = JSON.stringify(rawResult, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_deepgram.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Transcription for {fileName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transcript.length} characters • {wordCount} words
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
            <span className="flex items-center gap-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
          <button
            onClick={downloadTranscript}
            className="px-3 py-1.5 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors font-medium"
          >
            <span className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              Download
            </span>
          </button>
          {rawResult && (
            <>
              <button
                onClick={copyRawJson}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  copiedJson
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                <span className="flex items-center gap-1">
                  {copiedJson ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </span>
              </button>
              <button
                onClick={downloadRawJson}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-colors font-medium"
              >
                <span className="flex items-center gap-1">
                  <FileJson className="w-4 h-4" />
                  Download JSON
                </span>
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="relative">
        <textarea
          value={formattedTranscript}
          readOnly
          className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed whitespace-pre-wrap"
          placeholder="Transcription will appear here..."
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded text-xs border border-blue-200 dark:border-blue-700">
            {transcriptMode === 'speaker' ? '⏱️ Speaker turns' : transcriptMode === 'segments' ? '⏱️ Time segments' : '⏱️ Plain text'}
          </div>
          <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            Read-only
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>🤖 Generated by Deepgram AI</span>
          <span>📅 {new Date().toLocaleString()}</span>
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
