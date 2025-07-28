import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

const channels = [
  { name: "sonyyay", logo: "https://sonypicturesnetworks.com/images/logos/SONY%20YAY.png", url: "https://tataplay.slivcdn.com/hls/live/2011746/SonyYaySD/master_3500.m3u8", category: "Kids" },
  { name: "sonybbcearthhd", logo: "https://sonypicturesnetworks.com/images/logos/SBBCE_LOGO_NEW_PNG.png", url: "https://tataplay.slivcdn.com/hls/live/2011907/SonyBBCEarthHD/master_3500.m3u8", category: "Infotainment" },
  { name: "sonypixhd", logo: "https://sonypicturesnetworks.com/images/logos/PIX%20HD_WHITE.png", url: "https://tataplay.slivcdn.com/hls/live/2011748/PIXHD/master_3500.m3u8", category: "Movies" },
  { name: "sonyten1hd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen1_HD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2011747/TEN1HD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten1sd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen1_SD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2011739/TEN1SD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten2hd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen2_HD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020434/TEN2HD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten2sd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen2_SD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020590/TEN2SD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten3sd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen3_SD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020592/TEN3SD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten3hd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen3_HD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020591/TEN3HD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten4hd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen4_HD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020589/ten4hd/master_3500.m3u8", category: "Sports" },
  { name: "sonyten4sd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen4_SD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020437/ten4sd/master_3500.m3u8", category: "Sports" },
  { name: "sonyten5hd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen5_HD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020593/SONYSIXHD/master_3500.m3u8", category: "Sports" },
  { name: "sonyten5sd", logo: "https://sonypicturesnetworks.com/images/logos/SONY_SportsTen5_SD_Logo_CLR.png", url: "https://tataplay.slivcdn.com/hls/live/2020594/SONYSIXSD/master_3500.m3u8", category: "Sports" }
];

// Player Component
function Player({ channel }) {
  const playerRef = useRef(null);
  
  useEffect(() => {
    if (!channel || !playerRef.current) return;

    const loadPlayer = async () => {
      // Load scripts
      if (!window.Hls) {
        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      
      if (!window.DPlayer) {
        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // Initialize player
      const dp = new window.DPlayer({
        container: playerRef.current,
        autoplay: true,
        volume: 0.8,
        video: { url: channel.url, type: 'hls' }
      });

      // Auto-play logic
      const tryAutoPlay = async () => {
        try {
          dp.video.muted = false;
          dp.video.volume = 0.8;
          await dp.video.play();
        } catch {
          try {
            dp.video.muted = true;
            await dp.video.play();
            dp.video.muted = false;
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
    };

    loadPlayer();
  }, [channel]);

  return <div ref={playerRef} style={{ width: '100%', height: '100vh' }} />;
}

// Main App
export default function App() {
  const router = useRouter();
  const { c } = router.query;
  const [currentChannel, setCurrentChannel] = useState(null);

  useEffect(() => {
    if (c) {
      const channel = channels.find(ch => ch.name.toLowerCase() === c.toLowerCase());
      setCurrentChannel(channel);
    }
  }, [c]);

  // Global styles
  const globalStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #__next { height: 100%; background: #000; color: white; overflow: hidden; }
    body { font-family: Arial, sans-serif; }
  `;

  // If playing a channel
  if (c) {
    if (!currentChannel) {
      return (
        <>
          <Head>
            <title>Channel Not Found</title>
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
          </Head>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <h1>Channel not found</h1>
          </div>
        </>
      );
    }

    return (
      <>
        <Head>
          <title>{currentChannel.name} - Live TV</title>
          <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        </Head>
        <Player channel={currentChannel} />
      </>
    );
  }

  // Channel listing page
  const categories = [...new Set(channels.map(ch => ch.category))];
  
  return (
    <>
      <Head>
        <title>Live TV Channels</title>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </Head>
      <div style={{ padding: '20px', minHeight: '100vh', overflow: 'auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Live TV Channels</h1>
        
        {categories.map(category => (
          <div key={category} style={{ marginBottom: '30px' }}>
            <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>{category}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
              {channels.filter(ch => ch.category === category).map(channel => (
                <a
                  key={channel.name}
                  href={`/?c=${channel.name}`}
                  style={{
                    display: 'block', padding: '15px', backgroundColor: '#111', borderRadius: '8px',
                    textDecoration: 'none', color: 'white', border: '1px solid #333',
                    cursor: 'pointer', transition: 'all 0.3s'
                  }}
                  onMouseOver={e => { e.target.style.backgroundColor = '#222'; }}
                  onMouseOut={e => { e.target.style.backgroundColor = '#111'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      style={{ width: '50px', height: '30px', objectFit: 'contain', backgroundColor: 'white', padding: '2px', borderRadius: '4px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{channel.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{channel.category}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
   }
