import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react';

// three.js is ~600 KB; load the 3D studio only when the visitor gets close to it
// (or jumps to it via #studio3d), so the first screen opens fast on phones.
const RenovationStudio3D = lazy(() =>
  import('./RenovationStudio3D.tsx').then((m) => ({ default: m.RenovationStudio3D })),
);

type Props = ComponentProps<typeof RenovationStudio3D>;

function Placeholder() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-[560px] rounded-3xl bg-slate-200/60 dark:bg-white/5 animate-pulse flex items-center justify-center text-sm text-slate-500">
          3D…
        </div>
      </div>
    </div>
  );
}

export function LazyStudio3D(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(() => typeof window !== 'undefined' && window.location.hash === '#studio3d');

  useEffect(() => {
    if (load) return;
    const onHash = () => {
      if (window.location.hash === '#studio3d') setLoad(true);
    };
    window.addEventListener('hashchange', onHash);
    const el = ref.current;
    let io: IntersectionObserver | null = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) setLoad(true);
        },
        { rootMargin: '800px 0px' },
      );
      io.observe(el);
    } else {
      setLoad(true);
    }
    return () => {
      window.removeEventListener('hashchange', onHash);
      io?.disconnect();
    };
  }, [load]);

  return (
    <div id="studio3d" ref={ref} className="scroll-mt-20">
      {load ? (
        <Suspense fallback={<Placeholder />}>
          <RenovationStudio3D {...props} />
        </Suspense>
      ) : (
        <Placeholder />
      )}
    </div>
  );
}
