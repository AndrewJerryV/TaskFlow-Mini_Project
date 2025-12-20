'use client';

import React, { useEffect } from 'react';

interface VideoRoomProps {
    projectId: string;
    onLeave: () => void;
}

export default function VideoRoom({ projectId, onLeave }: VideoRoomProps) {
    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.onload = () => {
            if ((window as any).JitsiMeetExternalAPI) {
                const domain = 'meet.jit.si';
                const options = {
                    roomName: `TaskFlow-${projectId}`,
                    width: '100%',
                    height: '100%',
                    parentNode: document.getElementById('jitsi-container'),
                    userInfo: {
                        displayName: 'Andrew (You)'
                    },
                    configOverwrite: {
                        startWithAudioMuted: true,
                        startWithVideoMuted: false
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
                        ],
                    }
                };
                const api = new (window as any).JitsiMeetExternalAPI(domain, options);

                api.addEventListener('videoConferenceLeft', () => {
                    onLeave();
                    api.dispose();
                });
            }
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [projectId, onLeave]);

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <div id="jitsi-container" className="w-full h-full" />
            <button
                onClick={onLeave}
                className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-[101]"
            >
                Close Meeting
            </button>
        </div>
    );
}
