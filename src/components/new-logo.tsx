import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Define the props specifically for this component
interface NewLogoProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
  className?: string;
}

export const NewLogo = ({ className, ...props }: NewLogoProps) => (
  <div className={cn('relative', className)} {...props}>
    <Image
      src="/logo.png"
      alt="Engine Log Pro Logo"
      fill
      style={{ objectFit: 'contain' }}
      priority
    />
  </div>
);
