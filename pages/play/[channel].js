import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { channels } from '../../lib/channels';

export default function ChannelPlayer() {
  const router = useRouter();
  const { channel: channelName } = router.query;
  const playerRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);

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
    if (!channel || typeof window === 'undefined') return;

    // Load scripts dynamically
    const loadScripts = async () => {
      // Load HLS.js
      if (!window.Hls) {
        const hlsScript = document.createElement('script');
        hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js';
        hlsScript.async = true;
        document.head.appendChild(hlsScript);
        
        await new Promise((resolve) => {
          hlsScript.onload = resolve;
        });
      }

      // Load DPlayer
      if (!window.DPlayer) {
        const dplayerScript = document.createElement('script');
        dplayerScript.src = 'https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js';
        dplayerScript.async = true;
        document.head.appendChild(dplayerScript);
        
        await new Promise((resolve) => {
          dplayerScript.onload = resolve;
        });
      }

      // Initialize player
      if (window.DPlayer && playerRef.current) {
        const dp = new window.DPlayer({
          container: playerRef.current,
          autoplay: true,
          volume: 0.8,
          video: {
            url: channel.url,
            type: 'hls'
          }
        });

        // Force autoplay with sound (with fallback)
        const tryAutoPlay = async () => {
          const video = dp.video;
          try {
            video.muted = false;
            video.volume = 0.8;
            await video.play();
          } catch {
            try {
              video.muted = true;
              await video.play();
              video.muted = false;
            } catch {}
          }
        };

        tryAutoPlay();

        ['click', 'touchstart', 'keydown'].forEach(evt =>
          document.addEventListener(evt, () => {
            if (dp.video.muted) {
              dp.video.muted = false;
              dp.video.volume = 0.8;
            }
          }, { once: true })
        );
      }
    };

    loadScripts();
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
          marginTop: '20%',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1>{error}</h1>
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
          marginTop: '20%',
          background: '#000',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1>Loading...</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{channel.name} - Channel Player</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div 
        ref={playerRef}
        style={{
          width: '100vw',
          height: '100vh',
          background: '#000'
        }}
      />
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          background: #000;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        #__next {
          height: 100%;
          width: 100%;
        }
      `}</style>
    </>
  );
}