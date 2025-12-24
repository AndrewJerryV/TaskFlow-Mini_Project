'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Video, AlertTriangle, ExternalLink, X } from 'lucide-react';

interface VideoRoomProps {
    projectId: string;
    onLeave: () => void;
}

export default function VideoRoom({ projectId, onLeave }: VideoRoomProps) {
    const { currentUser } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const roomName = `TaskFlow-${projectId}`;
    const jitsiUrl = `https://meet.jit.si/${roomName}`;

    useEffect(() => {
        // Check for WebRTC support
        const hasWebRTC = !!(
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === 'function' &&
            window.RTCPeerConnection
        );

        if (!hasWebRTC) {
            setError('WebRTC is not available in your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
            setLoading(false);
            return;
        }

        // Check if we're on a secure context (HTTPS or localhost)
        const isSecure = window.isSecureContext;
        if (!isSecure) {
            setError('Video calls require a secure connection (HTTPS). Please access this site via HTTPS.');
            setLoading(false);
            return;
        }

        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;

        script.onload = () => {
            setLoading(false);
            try {
                if ((window as any).JitsiMeetExternalAPI) {
                    const domain = 'meet.jit.si';
                    const options = {
                        roomName: roomName,
                        width: '100%',
                        height: '100%',
                        parentNode: document.getElementById('jitsi-container'),
                        userInfo: {
                            displayName: currentUser?.name || 'Guest'
                        },
                        configOverwrite: {
                            startWithAudioMuted: true,
                            startWithVideoMuted: true, // Start with video muted to avoid permission issues
                            prejoinPageEnabled: false,
                            disableDeepLinking: true,
                        },
                        interfaceConfigOverwrite: {
                            SHOW_JITSI_WATERMARK: false,
                            SHOW_BRAND_WATERMARK: false,
                            TOOLBAR_BUTTONS: [
                                'microphone', 'camera', 'desktop', 'fullscreen',
                                'hangup', 'chat', 'settings', 'raisehand',
                                'videoquality', 'filmstrip', 'tileview'
                            ],
                        }
                    };

                    const api = new (window as any).JitsiMeetExternalAPI(domain, options);

                    api.addEventListener('videoConferenceLeft', () => {
                        onLeave();
                        api.dispose();
                    });

                    // Handle errors from Jitsi
                    api.addEventListener('errorOccurred', (e: any) => {
                        console.error('Jitsi error:', e);
                        if (e.error?.name === 'gum.not_found' || e.error?.name === 'gum.permission_denied') {
                            setError('Camera/microphone access denied. Please allow access and try again.');
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to initialize Jitsi:', err);
                setError('Failed to initialize video call. Try opening the meeting in a new tab.');
            }
        };

        script.onerror = () => {
            setLoading(false);
            setError('Failed to load video conferencing. Check your internet connection.');
        };

        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [projectId, roomName, currentUser?.name, onLeave]);

    // Error state - show fallback with link to open in new tab
    if (error) {
        return (
            <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Video Call Issue</h3>
                            <p className="text-sm text-gray-500">Unable to start embedded meeting</p>
                        </div>
                    </div>

                    <p className="text-gray-600 mb-4">{error}</p>

                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800 mb-2">
                            <strong>Alternative:</strong> Open the meeting in a new browser tab:
                        </p>
                        <a
                            href={jitsiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            <ExternalLink size={16} />
                            Open Meeting in New Tab
                        </a>
                    </div>

                    <button
                        onClick={onLeave}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <Video size={48} className="mx-auto mb-4 text-blue-500 animate-pulse" />
                        <p className="text-white text-lg">Starting meeting...</p>
                        <p className="text-gray-400 text-sm mt-2">Please allow camera/microphone access when prompted</p>
                    </div>
                </div>
            )}
            <div id="jitsi-container" className="w-full h-full" />
            <button
                onClick={onLeave}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg z-[101] transition-colors"
                title="Leave meeting"
            >
                <X size={20} />
            </button>
        </div>
    );
}
