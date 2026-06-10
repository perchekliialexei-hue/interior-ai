'use client';
import { useEffect, useRef } from 'react';

export function InteractiveBranches() {
  const branchLeftRef = useRef<HTMLDivElement>(null);
  const branchRightRef = useRef<HTMLDivElement>(null);
  const branchRightTopRef = useRef<HTMLDivElement>(null);
  const lanternsLeftRef = useRef<HTMLDivElement>(null);
  const lanternsRightRef = useRef<HTMLDivElement>(null);
  
  const rafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  
  const scrollOffsetTarget = useRef(0);
  const scrollOffsetCurrent = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onScroll = () => {
      scrollOffsetTarget.current = 1;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        scrollOffsetTarget.current = 0;
      }, 250);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const animate = () => {
      const lerpMouse = 0.05;
      const lerpScroll = 0.04;

      current.current.x += (mouse.current.x - current.current.x) * lerpMouse;
      current.current.y += (mouse.current.y - current.current.y) * lerpMouse;

      scrollOffsetCurrent.current += (scrollOffsetTarget.current - scrollOffsetCurrent.current) * lerpScroll;

      const cx = current.current.x;
      const cy = current.current.y;
      const sc = scrollOffsetCurrent.current;

      // Дистанция разъезда к краям экрана
      const pushX = sc * 120; 
      const pushY = sc * 20;  

      // ЛЕВАЯ ВЕРХНЯЯ ВЕТКА (Уходит влево: - pushX)
      if (branchLeftRef.current) {
        branchLeftRef.current.style.transform = 
          `translate(${(cx * -10) - pushX}px, ${(cy * -6) - pushY}px) rotate(${cx * 1}deg)`;
      }

      // ПРАВАЯ ВЕРХНЯЯ ВЕТКА (Уходит строго вправо к краю страницы: + pushX)
      if (branchRightTopRef.current) {
        branchRightTopRef.current.style.transform = 
          `translate(${(cx * 10) + pushX}px, ${(cy * -6) - pushY}px) rotate(${cx * -1}deg)`;
      }

      // ПРАВАЯ НИЖНЯЯ ВЕТКА (Уходит строго вправо к краю страницы: + pushX)
      if (branchRightRef.current) {
        branchRightRef.current.style.transform = 
          `translate(${(cx * 10) + pushX}px, ${(cy * 6) + pushY}px) rotate(${cx * 1}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
  <div className="pointer-events-none overflow-hidden" style={{ position: 'fixed', inset: 0, zIndex: 20 }}>

    {/* Левая верхняя ветка */}
    <div
      ref={branchLeftRef}
      className="select-none"
      style={{ position: 'fixed', left: '-120px', top: '-80px', width: '680px', opacity: 0.75, filter: 'blur(1px)', transformOrigin: 'left top', willChange: 'transform', zIndex: 30 }}
    >
      <img src="/images/branches.png" alt="" draggable={false} style={{ width: '100%', display: 'block', filter: 'brightness(0.85) drop-shadow(0 12px 40px rgba(30,15,5,0.5))' }} />
    </div>

    {/* Правая верхняя ветка */}
    <div
      ref={branchRightTopRef}
      className="select-none"
      style={{ position: 'fixed', right: '-120px', top: '-80px', width: '680px', opacity: 0.75, filter: 'blur(1px)', transformOrigin: 'right top', willChange: 'transform', zIndex: 30 }}
    >
      <img src="/images/branches.png" alt="" draggable={false} style={{ width: '100%', display: 'block', transform: 'scaleX(-1)', filter: 'brightness(0.85) drop-shadow(0 12px 40px rgba(30,15,5,0.5))' }} />
    </div>

    {/* Правая нижняя ветка */}
    <div
      ref={branchRightRef}
      className="select-none"
      style={{ position: 'fixed', right: '-140px', bottom: '-120px', width: '620px', opacity: 0.65, filter: 'blur(1px)', transformOrigin: 'right bottom', willChange: 'transform', zIndex: 30 }}
    >
      <img src="/images/branches.png" alt="" draggable={false} style={{ width: '100%', display: 'block', transform: 'rotate(180deg)', filter: 'brightness(0.8) drop-shadow(0 -12px 40px rgba(30,15,5,0.4))' }} />
    </div>

    {/* Левые фонарики — без ref, не двигаются */}
    <div
  className="select-none"
  style={{ position: 'fixed', left: '-60px', top: '-40px', width: '480px', opacity: 0.68, filter: 'blur(0.5px)', zIndex: 10 }}
>
  <img src="/images/lanterns.png" alt="" draggable={false} style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 0 40px rgba(220,160,50,0.6))' }} />
</div>

    {/* Правые фонарики — без ref, не двигаются */}
    <div
  className="select-none"
  style={{ position: 'fixed', right: '-100px', top: '20px', width: '340px', opacity: 0.55, filter: 'blur(0.5px)', zIndex: 10 }}
>
  <img src="/images/lanterns.png" alt="" draggable={false} style={{ width: '100%', display: 'block', transform: 'scaleX(-1)', filter: 'drop-shadow(0 0 40px rgba(220,160,50,0.6))' }} />
</div>

  </div>
);

}