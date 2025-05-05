'use client';

import Image from 'next/image';

export function HomeHero() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Image
        src="/icon.svg"
        alt="Panda Logo"
        width={256}
        height={256}
        className="mb-6"
      />
      <h1 className="text-4xl font-bold mb-4">Welcome to PandaMock</h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        Your Mockoon-compatible mock server UI. Create, manage, and run mock
        APIs with ease using our familiar interface built on Mockoon's engine.
      </p>
    </div>
  );
}
