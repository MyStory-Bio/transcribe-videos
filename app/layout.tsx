import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Video Transcriber - AI-Powered Video Transcription",
  description: "Upload and transcribe video files using Deepgram's AI speech recognition. Drag and drop videos for instant transcription with real-time progress tracking.",
  keywords: ["video transcription", "speech recognition", "AI transcription", "Deepgram", "video to text", "transcribe videos"],
  authors: [{ name: "Andres Campos" }],
  creator: "Andres Campos",
  publisher: "Andres Campos",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://transcribe-videos.vercel.app",
    title: "Video Transcriber - AI-Powered Video Transcription",
    description: "Upload and transcribe video files using Deepgram's AI speech recognition. Drag and drop videos for instant transcription with real-time progress tracking.",
    siteName: "Video Transcriber",
  },
  twitter: {
    card: "summary_large_image",
    title: "Video Transcriber - AI-Powered Video Transcription",
    description: "Upload and transcribe video files using Deepgram's AI speech recognition. Drag and drop videos for instant transcription with real-time progress tracking.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
