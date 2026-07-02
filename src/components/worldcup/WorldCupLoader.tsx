import React, { useEffect, useState } from 'react';

export default function WorldCupLoader() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden font-sans">
      {/* Dynamic Galaxy Background */}
      <div 
        className="absolute inset-0 opacity-40 bg-[url('http://redonion.se/img/codepen/fof/background-galaxy.jpg')] animate-pan" 
        style={{ backgroundRepeat: 'repeat', backgroundSize: 'auto 100%' }}>
      </div>
      
      <style>{`
        @keyframes pan {
          0% { background-position: 0 0; }
          100% { background-position: -300px 0; }
        }
        .animate-pan {
          animation: pan 10s linear infinite;
        }
        
        @keyframes ballSpin { 
          100% { transform: rotate(360deg); } 
        }
        .animate-ball-spin {
          animation: ballSpin 2s linear infinite;
        }

        @keyframes mybounce {
          from, 20%, 53%, 80%, to {
            animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -40px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -30px, 0);
          }
          90% {
            transform: translate3d(0,-2px,0);
          }
        }
        .animate-ball-bounce {
          animation: mybounce 2s infinite;
          transform-origin: center bottom;
        }

        @keyframes fireanimation {
          0% {
            box-shadow: 0 -2px 20px rgba(0, 15, 132, 0.72), 0 -15px 15px #fefcc9, 0 5px 5px #feec85, 0 -25px 45px #ffae34, 0 0px 50px #ec760c;
            opacity: 0.3;
          }
          100% {
            box-shadow: 0 0px 20px rgba(0, 15, 132, 0.72), 0 -10px 15px #fefcc9, 0 5px 2px #feec85, 0 -23px 40px #ffae34, 0 2px 50px #ec760c;
            opacity: 0.65;
          }
        }
        .fire-glow {
          width: 370px;
          height: 370px;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          margin-left: -185px;
          margin-top: -185px;
          animation: fireanimation 1s ease-in-out infinite alternate;
          transform: rotate(-90deg);
          z-index: 0;
        }
      `}</style>

      {/* Floating Stars Layer (simplified CSS version) */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-white opacity-80"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `pulse ${Math.random() * 2 + 1}s infinite alternate`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Ball & Fire */}
        <div className="animate-ball-bounce mb-12">
          <div className="relative w-[300px] h-[300px] md:w-[372px] md:h-[372px]">
            <div className="fire-glow mix-blend-screen"></div>
            <img 
                src="http://redonion.se/img/codepen/fof/fof-ball3.png" 
                className="relative z-10 w-full h-full animate-ball-spin drop-shadow-2xl" 
                alt="World Cup Ball" 
            />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white text-center tracking-widest uppercase" style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
          <span className="zh">连接预测引擎</span>
          <span className="en">BOOTING AI ENGINE</span>
          <span className="inline-block w-8 text-left">{dots}</span>
        </h1>
        
        <p className="text-slate-400/80 mt-6 font-mono tracking-[0.3em] uppercase text-sm animate-pulse">
          <span className="zh">正在唤醒云端推理节点</span>
          <span className="en">Waking up cloud inference nodes</span>
        </p>
      </div>
    </div>
  );
}
