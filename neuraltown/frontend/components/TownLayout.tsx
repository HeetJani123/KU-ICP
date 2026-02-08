'use client';

import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface TownLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  populationLabel?: string;
  timeLabel?: string;
  onReset?: () => void;
}

export default function TownLayout({ left, center, right, populationLabel = 'Population: --', timeLabel = 'Day --, --:--', onReset }: TownLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(24,34,56,0.8),_rgba(3,7,26,0.95))] text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-[300px_minmax(0,1fr)_320px] gap-x-6 px-6 py-8 pb-12">
        <aside className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/90 shadow-lg backdrop-blur">
          <div className="border-b border-border/60 px-5 py-5">
            <h2 className="font-serif text-lg text-card-foreground">Resident Directory</h2>
            <p className="text-xs text-muted-foreground/80">Select an agent to open their dossier.</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4 px-5 py-5">{left}</div>
          </ScrollArea>
        </aside>

        <main className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-8 py-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Simulation snapshot</p>
              <h1 className="font-serif text-3xl text-card-foreground">Simcity.AI Chronicle</h1>
              <p className="text-sm text-muted-foreground/80">Live telemetry from the settlement.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border/60 bg-muted/50 px-4 py-1 font-semibold text-foreground text-sm">{populationLabel}</span>
              <span className="rounded-full border border-border/60 bg-muted/40 px-4 py-1 text-foreground/80 text-sm">{timeLabel}</span>
              {onReset && (
                <Button 
                  onClick={onReset} 
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Simulation
                </Button>
              )}
            </div>
          </header>
          <ScrollArea className="flex-1">
            <div className="min-h-full px-8 py-6">
              {center}
            </div>
          </ScrollArea>
        </main>

        <aside className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/90 shadow-lg backdrop-blur">
          <div className="border-b border-border/60 px-5 py-5">
            <h2 className="font-serif text-lg text-card-foreground">Chronicle Feed</h2>
            <p className="text-xs text-muted-foreground/80">Recent events and signals.</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4 px-5 py-5">{right}</div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
