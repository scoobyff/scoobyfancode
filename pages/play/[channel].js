import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { channels } from '../../lib/channels';

export default function ChannelPlayer() {
  const router = useRouter();
  const { channel: channelName } = router.query;
  const playerRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(0);

  useEffect(() => {
    if (!channelName) return;

    const foundChannel = channels.find(
      ch => ch.name.toLowerCase() === channelName.toLowerCase()
    );

    if (!foundChannel) {
      setError('Channel not found');
      return;
    }

    setChannel(foundChannel);
  }, [channelName]);

  useEffect(() => {
    if (!channel || scriptsLoaded < 2 || !playerRef.current) return;

    // Clear any existing content
    playerRef.current.innerHTML = '';

    try {
      const dp = new window.DPlayer({
        container: playerRef.current,
        autoplay: true,
        volume: 0.8,
        video: {
          url: channel.url,
          type: 'hls',
          customType: {
            hls: function(video, player) {
              if (window.Hls.isSupported()) {
                const hls = new window.Hls({
                  enableWorker: false,
                  lowLatencyMode: true,
                  backBufferLength: 90
                });
                hls.loadSource(video.src);
                hls.attachMedia(video);
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = video.src;
              }
            }
          }
        },
        theme: '#FADFA3',
        loop: false,
        screenshot: false,
        hotkey: true,
        preload: 'auto',
        mutex: true
      });

      // Handle autoplay
      const handleAutoplay = async () => {
        try {
          dp.video.muted = false;
          dp.video.volume = 0.8;
          await dp.play();
        } catch (e) {
          console.log('Autoplay failed, will try muted first');
          try {
            dp.video.muted = true;
            await dp.play();
            // Unmute on first user interaction
            const handleInteraction = () => {
              dp.video.muted = false;
              dp.video.volume = 0.8;
              document.removeEventListener('click', handleInteraction);
              document.removeEventListener('touchstart', handleInteraction);
            };
            document.addEventListener('click', handleInteraction);
            document.addEventListener('touchstart', handleInteraction);
          } catch (e2) {
            console.log('Failed to play even muted:', e2);
          }
        }
      };

      // Wait a bit for the player to initialize
      setTimeout(handleAutoplay, 1000);

    } catch (e) {
      console.error('Player initialization error:', e);
      setError('Failed to initialize player');
    }
  }, [channel, scriptsLoaded]);

  return (
    <>
      <Head>
        <title>{channel ? channel.name : 'Channel Player'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Script 
        src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"
        onLoad={() => setScriptsLoaded(prev => prev + 1)}
        strategy="beforeInteractive"
      />
      
      <Script 
        src="https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js"
        onLoad={() => setScriptsLoaded(prev => prev + 1)}
        strategy="beforeInteractive"
      />

      {error ? (
        <div style={{
          color: 'white',
          textAlign: 'center',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          <h1>{error}</h1>
        </div>
      ) : !channel ? (
        <div style={{
          color: 'white',
          textAlign: 'center',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          <h1>Loading channel...</h1>
        </div>
      ) : (
        <div 
          ref={playerRef}
          style={{
            width: '100vw',
            height: '100vh',
            background: '#000'
          }}
        />
      )}

      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          background: #000;
          height: 100%;
          width: 100%;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }
        #__next {
          height: 100%;
          width: 100%;
        }
        .dplayer {
          width: 100% !important;
          height: 100% !important;
        }
        .dplayer-video-wrap {
          width: 100% !important;
          height: 100% !important;
        }
        .dplayer-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
        }
      `}</style>
    </>
  );
}