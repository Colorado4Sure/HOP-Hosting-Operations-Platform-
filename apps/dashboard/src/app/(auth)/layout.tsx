import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="max-w-md text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-foreground/10 text-3xl font-black">
              H
            </div>
            <span className="text-4xl font-extrabold tracking-tight">HOP</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Hosting Operations Platform</h2>
          <p className="text-primary-foreground/70 leading-relaxed">
            Manage your hosting business — clients, billing, services, support and automation — from a single unified platform.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl font-black">
              H
            </div>
            <span className="text-2xl font-bold">HOP</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
