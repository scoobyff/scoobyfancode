import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { channels } from '../../lib/channels';

export default function SimpleChannelPlayer() {
  const router = useRouter();
  const { channel: channelName } = router.query;
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelName) return;

    const foundChannel = channels.find(
      ch => ch.name.toLowerCase() === channelName.toLowerCase()
    );

    if (!foundChannel) {
      setError('Channel not found');
      setLoading(false);
      return;
    }

    setChannel(foundChannel);
  }, [channelName]);

  useEffect(() => {
    if (!channel || !hlsLoaded || !videoRef.current) return;

    const video = videoRef.current;
    
    const initializePlayer = () => {
      try {
        if (window.Hls && window.Hls.isSupported()) {
          // Clean up existing HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new window.Hls({
            enableWorker: false,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10
          });

          hlsRef.current = hls;

          hls.loadSource(channel.url);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed');
            setLoading(false);
            
            // Try to play
            const playVideo = async () => {
              try {
                video.muted = false;
                video.volume = 0.8;
                await video.play();
                console.log('Video started playing');
              } catch (e) {
                console.log('Autoplay failed, trying muted');
                try {
                  video.muted = true;
                  await video.play();
                  console.log('Video started playing muted');
                  
                  // Add click to unmute
                  const unmute = () => {
                    video.muted = false;
                    video.volume = 0.8;
                    document.removeEventListener('click', unmute);
                    document.removeEventListener('touchstart', unmute);
                  };
                  document.addEventListener('click', unmute);
                  document.addEventListener('touchstart', unmute);
                } catch (e2) {
                  console.error('Failed to play video:', e2);
                  setError('Failed to play video');
                }
              }
            };

            setTimeout(playVideo, 500);
          });

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error, trying to recover...');
                  hls.startLoad();
                  break;
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error, trying to recover...');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('Cannot recover from HLS error');
                  break;
              }
            }
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = channel.url;
          setLoading(false);
          
          const playVideo = async () => {
            try {
              video.muted = false;
              video.volume = 0.8;
              await video.play();
            } catch (e) {
              try {
                video.muted = true;
                await video.play();
              } catch (e2) {
                setError('Failed to play video');
              }
            }
          };

          video.addEventListener('loadedmetadata', playVideo);
        } else {
          setError('HLS not supported in this browser');
        }
      } catch (e) {
        console.error('Player initialization error:', e);
        setError('Failed to initialize player');
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, hlsLoaded]);

  if (error) {
    return (
      <>
        <Head>
          <title>Channel Player - Error</title>
        </Head>
        <div style={{
          color: 'white',
          textAlign: 'center',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          <h1>⚠️ {error}</h1>
          <p>Please try refreshing the page or selecting a different channel.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{channel ? `${channel.name} - Live` : 'Channel Player'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      </Head>

      <Script 
        src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"
        onLoad={() => setHlsLoaded(true)}
        strategy="beforeInteractive"
      />

      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            color: 'white',
            fontSize: '18px',
            zIndex: 10
          }}>
            Loading {channel?.name}...
          </div>
        )}
        
        <video
          ref={videoRef}
          controls
          autoPlay
          muted={false}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000'
          }}
        />
      </div>

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
        video::-webkit-media-controls-panel {
          background-color: rgba(0, 0, 0, 0.8);
        }
        video::-webkit-media-controls {
          background-color: rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </>
  );
}