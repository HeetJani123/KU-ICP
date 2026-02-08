'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    age: number;
    location: string;
    health: number;
    hunger: number;
    energy: number;
    last_thought?: string;
    last_action?: string;
    personality?: {
      traits?: string[];
    };
    mood?: string;
    moodScore?: number;
    wealthClass?: string;
    bornDay?: number;
  };
  isSelected?: boolean;
  onSelect?: () => void;
}

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

export default function AgentCard({ agent, isSelected, onSelect }: AgentCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.();
          }
        }}
        className={`cursor-pointer border border-border/70 bg-card/80 transition backdrop-blur ${isSelected ? 'border-primary shadow-lg' : 'hover:border-primary/40 hover:shadow-md'}`}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">{agent.name}</CardTitle>
            <CardDescription className="text-muted-foreground">Age {agent.age} · {agent.location}</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-secondary/30 capitalize text-secondary-foreground">
            {agent.mood || 'unknown'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {[{
            label: 'Health',
            value: agent.health,
          }, {
            label: 'Hunger',
            value: agent.hunger,
          }, {
            label: 'Energy',
            value: agent.energy,
          }].map(({ label, value }) => (
            <div key={`${agent.id}-${label}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                <span>{label}</span>
                <span className="font-medium text-foreground/80">{formatPercent(value)}</span>
              </div>
              <Progress value={Math.max(0, Math.min(100, value))} aria-label={`${label} ${value}%`} />
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-muted-foreground/80">
            <span>Current activity</span>
            <span className="font-medium text-foreground/80">{agent.last_action || 'Idle'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/80">Mood score</span>
            <span className="text-sm font-semibold text-foreground/90">{agent.moodScore ?? 0}</span>
          </div>
          <div className="pt-2">
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-primary/40 bg-transparent text-foreground hover:bg-primary/10"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.();
                }}
              >
                View dossier
              </Button>
            </DialogTrigger>
          </div>
        </CardContent>
      </Card>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
          <DialogDescription>
            Day {agent.bornDay ?? '—'} · {agent.wealthClass || 'Origin unknown'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="border-border/60 bg-muted/30 text-foreground/90">Age {agent.age}</Badge>
            <Badge variant="outline" className="border-border/60 bg-muted/30 text-foreground/90">{agent.location}</Badge>
            <Badge variant="outline" className="border-border/60 bg-muted/30 text-foreground/90">Mood score {agent.moodScore ?? 0}</Badge>
          </div>
          {agent.last_thought && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground/90">Latest thought</h4>
              <p className="rounded-md bg-muted/40 p-3 text-sm italic text-muted-foreground">“{agent.last_thought}”</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[{
              label: 'Health',
              value: agent.health,
            }, {
              label: 'Hunger',
              value: agent.hunger,
            }, {
              label: 'Energy',
              value: agent.energy,
            }].map(({ label, value }) => (
              <Card key={`${agent.id}-dialog-${label}`} className="border border-border/60 bg-card/80">
                <CardHeader className="space-y-1">
                  <CardDescription className="uppercase tracking-wide text-xs text-muted-foreground/80">{label}</CardDescription>
                  <CardTitle className="text-xl">{formatPercent(value)}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Current activity</span>
              <Badge variant="secondary" className="bg-secondary/30 capitalize text-secondary-foreground">{agent.last_action || 'Idle'}</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground/90">Traits</h4>
              <div className="flex flex-wrap gap-2">
                {(agent.personality?.traits || []).length > 0 ? (
                  (agent.personality?.traits || []).map((trait, index) => (
                    <Badge key={`${agent.id}-trait-${index}`} variant="outline" className="border-border/60 bg-muted/30 capitalize text-foreground/80">
                      {trait}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No traits recorded.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
