'use client';

import { Card as CardType } from '@/types/game';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function Card({ card, selected, onClick, size = 'medium' }: CardProps) {
  const sizeClasses = {
    small: 'w-16 sm:w-20',
    medium: 'w-20 sm:w-24',
    large: 'w-24 sm:w-28',
  };

  // 카드 이미지 경로
  const getCardImage = () => {
    if (card.rank === 'joker') {
      return '/cards/13.jpg';
    }
    return `/cards/${card.rank}.jpg`;
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        aspect-[9/16]
        transition-all duration-200 ease-out
        ${selected ? '-translate-y-4 sm:-translate-y-8 scale-105' : 'hover:scale-105'}
        ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}
        relative shrink-0
        ${selected ? 'shadow-2xl shadow-yellow-400/50' : 'shadow-lg shadow-black/30'}
        hover:shadow-xl hover:shadow-black/40
      `}
    >
      <img
        src={getCardImage()}
        alt={`Card ${card.rank}`}
        className='w-full h-full object-cover rounded-lg sm:rounded-xl border-2 border-white/20'
        draggable={false}
      />
    </div>
  );
}
