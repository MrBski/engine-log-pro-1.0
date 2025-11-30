import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const NewLogo = ({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <Image
    src="/logo.png"
    alt="Engine Log Pro Logo"
    width={160}
    height={120}
    className={cn('w-16 h-auto', className)}
    priority
    {...props}
  />
);
