import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

export type LucideIconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

function Base({
  size = 26,
  color = '#8A94A6',
  strokeWidth = 2,
  children,
}: Required<Pick<LucideIconProps, 'size' | 'color' | 'strokeWidth'>> & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function LucideHome(props: LucideIconProps) {
  const { size = 26, color = '#8A94A6', strokeWidth = 2 } = props;
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Path d="M3 10.2 12 3l9 7.2V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.8Z" />
      <Path d="M9 22v-8h6v8" />
    </Base>
  );
}

export function LucidePill(props: LucideIconProps) {
  const { size = 26, color = '#8A94A6', strokeWidth = 2 } = props;
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Path d="m10.5 20.5-7-7a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z" />
      <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </Base>
  );
}

export function LucideJournal(props: LucideIconProps) {
  const { size = 26, color = '#8A94A6', strokeWidth = 2 } = props;
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
      <Line x1="16.5" y1="4" x2="16.5" y2="22" />
      <Path d="M10.5 9l-3 3 3 3" />
    </Base>
  );
}

export function LucideUser(props: LucideIconProps) {
  const { size = 26, color = '#8A94A6', strokeWidth = 2 } = props;
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M20 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
    </Base>
  );
}
