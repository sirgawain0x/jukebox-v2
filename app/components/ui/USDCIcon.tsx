"use client";

import Image from "next/image";
import { FC } from "react";

interface USDCIconProps {
    className?: string;
    size?: number;
}

export const USDCIcon: FC<USDCIconProps> = ({ className = "", size = 16 }) => {
    return (
        <span className={`inline-flex items-center justify-center align-middle ${className}`} style={{ width: size, height: size }}>
            <Image
                src="/tokens/usdc-logo.svg"
                alt="USDC"
                width={size}
                height={size}
                className="w-full h-full object-contain"
            />
        </span>
    );
};
