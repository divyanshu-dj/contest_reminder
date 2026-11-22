import React, { useEffect, useState } from 'react';
import { Calendar, CheckSquare, Download, Link2, Loader2, RefreshCw, Unlink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Contest, Platform } from '@/utils/types';
import { downloadIcs, REMINDER_OPTIONS } from '@/utils/calendar';
import {
  CalendarStatus,
  disconnectCalendar,
  fetchCalendarConfig,
  fetchCalendarStatus,
  resyncCalendar,
  saveCalendarPreferences,
} from '@/utils/api';
import { toast } from '@/components/ui/use-toast';

interface CalendarSyncProps {
  contests: Contest[];
}

const ALL_PLATFORMS: Platform[] = ['codeforces', 'codechef', 'leetcode'];

/** Messages for the ?calendar=... value the backend redirects back with. */
const CALLBACK_MESSAGES: Record<string, { title: string; description: string; destructive?: boolean }> = {
  connected: { title: 'Google Calendar connected', description: 'Upcoming contests have been added, and new ones will follow automatically.' },
  denied: { title: 'Connection cancelled', description: 'You declined access on the Google consent screen.', destructive: true },
  norefresh: { title: 'Could not connect', description: 'Google did not return a durable token. Remove this app from your Google account permissions and try again.', destructive: true },
  unavailable: { title: 'Calendar sync is unavailable', description: 'The server does not have Google credentials configured.', destructive: true },
  invalid: { title: 'Connection failed', description: 'That sign-in link had expired. Please try again.', destructive: true },
  error: { title: 'Connection failed', description: 'Google returned an error. Please try again.', destructive: true },
};

const CalendarSync: React.FC<CalendarSyncProps> = ({ contests }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<CalendarStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [platforms, setPlatforms] = useState<Platform[]>(ALL_PLATFORMS);
  const [reminders, setReminders] = useState<number[]>([60]);

  // Surface the outcome of the Google round trip, then clean the URL so a
  // refresh does not repeat the message.
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get('calendar');
    if (!outcome) return;

    const message = CALLBACK_MESSAGES[outcome];
    if (message) {
      toast({
        title: message.title,
        description: message.description,
        variant: message.destructive ? 'destructive' : undefined,
      });
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [config, current] = await Promise.all([fetchCalendarConfig(), fetchCalendarStatus()]);
      if (cancelled) return;

      setAvailable(config.available);
      setStatus(current);
      if (current.connected) {
        setPlatforms((current.platforms?.length ? current.platforms : ALL_PLATFORMS) as Platform[]);
        setReminders(current.reminderMinutes?.length ? current.reminderMinutes : [60]);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const togglePlatform = (platform: Platform) => {
    setPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const toggleReminder = (minutes: number) => {
    setReminders(prev =>
      prev.includes(minutes) ? prev.filter(m => m !== minutes) : [...prev, minutes].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      // An empty platform selection means "everything" on the server, which is
      // also what the user means by leaving nothing ticked.
      const selected = platforms.length === ALL_PLATFORMS.length ? [] : platforms;
      const { resynced, resyncError } = await saveCalendarPreferences(selected, reminders);

      if (resyncError) {
        toast({ title: 'Saved, but the calendar could not be updated', description: resyncError, variant: 'destructive' });
      } else {
        toast({ title: 'Reminders updated', description: `${resynced} contest${resynced === 1 ? '' : 's'} updated in your calendar.` });
      }
      setStatus(await fetchCalendarStatus());
    } catch {
      toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleResync = async () => {
    setBusy(true);
    try {
      const synced = await resyncCalendar();
      toast({ title: 'Calendar synced', description: `${synced} upcoming contest${synced === 1 ? '' : 's'} written.` });
      setStatus(await fetchCalendarStatus());
    } catch {
      toast({ title: 'Sync failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectCalendar();
      setStatus({ connected: false });
      toast({ title: 'Disconnected', description: 'Access was revoked at Google. Events already in your calendar were left in place.' });
    } catch {
      toast({ title: 'Could not disconnect', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    const selected = contests.filter(
      contest => platforms.includes(contest.platform) && contest.status !== 'COMPLETED'
    );

    if (selected.length === 0) {
      toast({
        title: 'No contests to add',
        description: 'Select at least one platform with upcoming or ongoing contests',
        variant: 'destructive',
      });
      return;
    }

    downloadIcs(selected, reminders);
    toast({
      title: 'Calendar file downloaded',
      description: `Open contests.ics to add ${selected.length} contest${selected.length === 1 ? '' : 's'}, with your chosen reminders.`,
    });
    setIsOpen(false);
  };

  const platformSection = (
    <div className="space-y-2">
      <h5 className="text-sm font-medium">Platforms</h5>
      <div className="space-y-2">
        {ALL_PLATFORMS.map(platform => (
          <div key={platform} className="flex items-center space-x-2">
            <Checkbox
              id={`cal-platform-${platform}`}
              checked={platforms.includes(platform)}
              onCheckedChange={() => togglePlatform(platform)}
            />
            <Label htmlFor={`cal-platform-${platform}`} className="capitalize font-normal">
              {platform}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  const reminderSection = (
    <div className="space-y-2">
      <h5 className="text-sm font-medium">Remind me</h5>
      <div className="space-y-2">
        {REMINDER_OPTIONS.map(option => (
          <div key={option.minutes} className="flex items-center space-x-2">
            <Checkbox
              id={`cal-reminder-${option.minutes}`}
              checked={reminders.includes(option.minutes)}
              onCheckedChange={() => toggleReminder(option.minutes)}
            />
            <Label htmlFor={`cal-reminder-${option.minutes}`} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      {reminders.length === 0 && (
        <p className="text-xs text-muted-foreground">
          With nothing selected you will be reminded one hour before.
        </p>
      )}
      {reminders.length >= 5 && (
        <p className="text-xs text-muted-foreground">
          Google allows at most five reminders per event.
        </p>
      )}
    </div>
  );

  return (
    <div className="my-4">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {status.connected ? 'Calendar connected' : 'Add to Calendar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Contest reminders</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking your calendar...
              </div>
            ) : (
              <>
                {status.connected ? (
                  <>
                    <div className="rounded-md border bg-secondary/40 p-2.5 text-xs">
                      <p className="font-medium text-foreground">Syncing to {status.email}</p>
                      <p className="text-muted-foreground mt-0.5">
                        New contests are added automatically every 6 hours.
                        {status.lastSyncedAt &&
                          ` Last synced ${new Date(status.lastSyncedAt).toLocaleString()}.`}
                      </p>
                      {status.lastSyncError && (
                        <p className="text-destructive mt-1">Last sync failed: {status.lastSyncError}</p>
                      )}
                    </div>

                    {platformSection}
                    {reminderSection}

                    <Button onClick={handleSave} disabled={busy} className="w-full gap-2">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                      Save reminders
                    </Button>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResync} disabled={busy} className="flex-1 gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync now
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy} className="flex-1 gap-1.5">
                        <Unlink className="h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {platformSection}
                    {reminderSection}

                    {available ? (
                      <>
                        <Button asChild className="w-full gap-2">
                          <a href="/api/calendar/connect">
                            <Link2 className="h-4 w-4" />
                            Connect Google Calendar
                          </a>
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Creates a separate &ldquo;Contest Reminder&rdquo; calendar you can hide or delete at any
                          time. This app cannot see your existing calendars.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Automatic syncing is not configured on this server. You can still download a
                        calendar file below.
                      </p>
                    )}

                    <div className="border-t pt-3">
                      <Button variant="outline" onClick={handleDownload} className="w-full gap-2">
                        <Download className="h-4 w-4" />
                        Download .ics instead
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        A one-off file for Google, Apple or Outlook. It will not pick up contests
                        announced later.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarSync;
