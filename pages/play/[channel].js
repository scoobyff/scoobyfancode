import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { channels } from '../../lib/channels';

export default function ChannelPlayer() {
  const router = useRouter();
  const { channel: channelName } = router.query;
  const playerRef = useRef(null);
  const dpRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);
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
    if (!channel || typeof window === 'undefined') return;

    const loadScriptsAndInitPlayer = async () => {
      try {
        // Load DPlayer CSS first
        if (!document.querySelector('link[href*="dplayer"]')) {
          const dplayerCSS = document.createElement('link');
          dplayerCSS.rel = 'stylesheet';
          dplayerCSS.href = 'https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.css';
          document.head.appendChild(dplayerCSS);
        }

        // Load HLS.js
        if (!window.Hls) {
          await new Promise((resolve, reject) => {
            const hlsScript = document.createElement('script');
            hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js';
            hlsScript.onload = resolve;
            hlsScript.onerror = reject;
            document.head.appendChild(hlsScript);
          });
        }

        // Load DPlayer
        if (!window.DPlayer) {
          await new Promise((resolve, reject) => {
            const dplayerScript = document.createElement('script');
            dplayerScript.src = 'https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js';
            dplayerScript.onload = resolve;
            dplayerScript.onerror = reject;
            document.head.appendChild(dplayerScript);
          });
        }

        // Wait a bit more to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!window.DPlayer) {
          throw new Error('DPlayer failed to load');
        }

        // Clear any existing player
        if (dpRef.current) {
          dpRef.current.destroy();
          dpRef.current = null;
        }

        // Clear container
        if (playerRef.current) {
          playerRef.current.innerHTML = '';
        }

        // Initialize DPlayer
        const dp = new window.DPlayer({
          container: playerRef.current,
          autoplay: true,
          theme: '#FADFA3',
          loop: false,
          lang: 'en',
          screenshot: true,
          hotkey: true,
          preload: 'auto',
          volume: 0.8,
          mutex: true,
          video: {
            url: channel.url,
            type: 'hls',
            customType: {
              hls: function(video, player) {
                if (window.Hls && window.Hls.isSupported()) {
                  const hls = new window.Hls({
                    enableWorker: false,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxBufferSize: 60 * 1000 * 1000,
                    liveSyncDurationCount: 3
                  });
                  hls.loadSource(video.src);
                  hls.attachMedia(video);
                  
                  hls.on(window.Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                      switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                          hls.startLoad();
                          break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                          hls.recoverMediaError();
                          break;
                        default:
                          console.error('HLS error:', data);
                          break;
                      }
                    }
                  });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = video.src;
                }
              }
            }
          },
          contextmenu: [
            {
              text: 'Channel: ' + channel.name,
              link: '#'
            }
          ]
        });

        dpRef.current = dp;
        setLoading(false);

        // Enhanced autoplay handling
        const handleAutoplay = async () => {
          try {
            // First try unmuted
            dp.video.muted = false;
            dp.video.volume = 0.8;
            await dp.play();
            console.log('Playing with sound');
          } catch (e) {
            console.log('Autoplay with sound failed, trying muted');
            try {
              // Try muted autoplay
              dp.video.muted = true;
              await dp.play();
              console.log('Playing muted');
              
              // Show click to unmute message
              const unmuteNotice = document.createElement('div');
              unmuteNotice.innerHTML = '🔇 Click to unmute';
              unmuteNotice.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 1000;
                cursor: pointer;
              `;
              
              playerRef.current.appendChild(unmuteNotice);
              
              // Handle user interaction to unmute
              const handleUnmute = () => {
                dp.video.muted = false;
                dp.video.volume = 0.8;
                if (unmuteNotice.parentNode) {
                  unmuteNotice.remove();
                }
                document.removeEventListener('click', handleUnmute);
                document.removeEventListener('touchstart', handleUnmute);
              };
              
              unmuteNotice.addEventListener('click', handleUnmute);
              document.addEventListener('click', handleUnmute, { once: true });
              document.addEventListener('touchstart', handleUnmute, { once: true });
              
            } catch (e2) {
              console.error('Even muted autoplay failed:', e2);
              setError('Autoplay failed. Please click play button.');
            }
          }
        };

        // Wait for player ready and then try autoplay
        dp.on('loadedmetadata', () => {
          console.log('Video metadata loaded');
          setTimeout(handleAutoplay, 1000);
        });

        dp.on('error', (e) => {
          console.error('DPlayer error:', e);
          setError('Video playback error');
        });

        dp.on('canplay', () => {
          console.log('Video can play');
          setLoading(false);
        });

      } catch (error) {
        console.error('Failed to load scripts or initialize player:', error);
        setError('Failed to load video player');
        setLoading(false);
      }
    };

    loadScriptsAndInitPlayer();

    // Cleanup
    return () => {
      if (dpRef.current) {
        try {
          dpRef.current.destroy();
        } catch (e) {
          console.log('Player cleanup error:', e);
        }
        dpRef.current = null;
      }
    };
  }, [channel]);

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
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (!channel) {
    return (
      <>
        <Head>
          <title>Channel Player - Loading</title>
        </Head>
        <div style={{
          color: 'white',
          textAlign: 'center',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          <h1>🔍 Finding channel...</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{channel.name} - Live TV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <meta name="description" content={`Watch ${channel.name} live stream`} />
      </Head>
      
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '18px',
            zIndex: 1000,
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '20px' }}>📺 Loading {channel.name}...</div>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #333',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        )}
        
        <div 
          ref={playerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #__next {
          height: 100%;
          width: 100%;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* DPlayer Customizations */
        .dplayer {
          width: 100% !important;
          height: 100% !important;
          background: #000;
        }
        
        .dplayer-video-wrap {
          width: 100% !important;
          height: 100% !important;
        }
        
        .dplayer-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
        }
        
        .dplayer-controller {
          background: linear-gradient(transparent, rgba(0,0,0,0.8)) !important;
        }
        
        .dplayer-controller-mask {
          background: linear-gradient(transparent, rgba(0,0,0,0.8)) !important;
        }
        
        /* Make controls more visible */
        .dplayer-icons {
          color: #fff !important;
        }
        
        .dplayer-setting-box {
          background: rgba(0,0,0,0.9) !important;
        }
        
        .dplayer-menu {
          background: rgba(0,0,0,0.9) !important;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .dplayer-controller {
            height: 60px !important;
          }
          
          .dplayer-icons {
            font-size: 16px !important;
          }
          
          .dplayer-volume {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}