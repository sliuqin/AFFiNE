import clsx from 'clsx';
import type { LottieRef } from 'lottie-react';
import Lottie from 'lottie-react';
import { useEffect, useRef } from 'react';

import * as styles from './animated-play-icon.css';
import pausetoplay from './pausetoplay.json';
import playtopause from './playtopause.json';

export interface AnimatedPlayIconProps {
  state: 'play' | 'pause';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const AnimatedPlayIcon = ({
  state,
  className,
  onClick,
}: AnimatedPlayIconProps) => {
  const lottieRef: LottieRef = useRef(null);
  const data = state === 'pause' ? pausetoplay : playtopause;

  // todo: skip first render
  useEffect(() => {
    if (lottieRef.current) {
      const lottie = lottieRef.current;
      lottie.setSpeed(2);
      lottie.play();
    }
  }, [state]);

  return (
    <Lottie
      onClick={onClick}
      lottieRef={lottieRef}
      className={clsx(styles.root, className)}
      animationData={data}
      loop={false}
      autoplay={false}
    />
  );
};
