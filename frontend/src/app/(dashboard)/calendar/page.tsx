"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api, type CalendarEvent, type CreateCalendarEventInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Day view dialog state
  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [dayViewDay, setDayViewDay] = useState<Date | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [form, setForm] = useState<CreateCalendarEventInput>({
    title: "",
    startAt: "",
    allDay: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const data = await api.calendar.list(start, end);
      setEvents(data);
    } catch {
      toast.error("Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth, fetchEvents]);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Convert UTC ISO string to the value expected by datetime-local input (local time)
  function toLocalInput(iso: string): string {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }

  // Convert datetime-local input value back to a full ISO string (UTC)
  function fromLocalInput(local: string): string {
    return new Date(local).toISOString();
  }

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(parseISO(e.startAt), day));
  }

  function openNewEvent(day: Date) {
    setSelectedEvent(null);
    setSelectedDay(day);
    setForm({
      title: "",
      startAt: format(day, "yyyy-MM-dd") + "T09:00",
      allDay: false,
    });
    setDialogOpen(true);
  }

  function openEditEvent(e: CalendarEvent, stopPropagation: () => void) {
    stopPropagation();
    setSelectedEvent(e);
    setSelectedDay(parseISO(e.startAt));
    setForm({
      title: e.title,
      description: e.description,
      startAt: e.allDay ? e.startAt.slice(0, 10) + "T00:00" : toLocalInput(e.startAt),
      endAt: e.endAt ? (e.allDay ? e.endAt.slice(0, 10) + "T00:00" : toLocalInput(e.endAt)) : undefined,
      allDay: e.allDay,
      location: e.location,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Informe um título para o evento.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startAt: form.allDay ? form.startAt : fromLocalInput(form.startAt),
        endAt: form.endAt ? (form.allDay ? form.endAt : fromLocalInput(form.endAt)) : undefined,
      };
      if (selectedEvent) {
        const updated = await api.calendar.update(selectedEvent.id, payload);
        setEvents((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
        toast.success("Evento atualizado!");
      } else {
        const created = await api.calendar.create(payload);
        setEvents((prev) => [...prev, created]);
        toast.success("Evento criado!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      await api.calendar.delete(selectedEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      toast.success("Evento removido.");
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao remover evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = eventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
              <div
                key={idx}
                onClick={() => { setDayViewDay(day); setDayViewOpen(true); }}
                className={cn(
                  "min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r cursor-pointer hover:bg-accent/40 transition-colors",
                  !isCurrentMonth && "opacity-40",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
                    isTodayDate &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); openEditEvent(e, () => {}); }}
                      className="w-full truncate rounded bg-primary/15 px-1 py-0.5 text-left text-[10px] font-medium text-primary hover:bg-primary/25 transition-colors"
                    >
                      {!e.allDay &&
                        format(parseISO(e.startAt), "HH:mm") + " "}
                      {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground pl-1">
                      +{dayEvents.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day View Dialog */}
      <Dialog open={dayViewOpen} onOpenChange={setDayViewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dayViewDay && format(dayViewDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 pt-1">
            {dayViewDay && eventsForDay(dayViewDay).map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setDayViewOpen(false);
                  openEditEvent(e, () => {});
                }}
                className="flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                <span className="mt-0.5 text-xs text-muted-foreground w-10 shrink-0">
                  {e.allDay ? "dia int." : format(parseISO(e.startAt), "HH:mm")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                  {e.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5" />{e.location}
                    </p>
                  )}
                </div>
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setDayViewOpen(false);
                if (dayViewDay) openNewEvent(dayViewDay);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "Editar evento" : "Novo evento"}
              {selectedDay && (
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="evt-title">Título</Label>
              <Input
                id="evt-title"
                placeholder="Ex: Reunião com João"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evt-start">Início</Label>
                <Input
                  id="evt-start"
                  type={form.allDay ? "date" : "datetime-local"}
                  value={
                    form.allDay
                      ? form.startAt.slice(0, 10)
                      : form.startAt.slice(0, 16)
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      startAt: form.allDay
                        ? e.target.value + "T00:00"
                        : e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evt-end">Fim</Label>
                <Input
                  id="evt-end"
                  type={form.allDay ? "date" : "datetime-local"}
                  value={
                    form.endAt
                      ? form.allDay
                        ? form.endAt.slice(0, 10)
                        : form.endAt.slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      endAt: form.allDay
                        ? e.target.value + "T23:59"
                        : e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="evt-allday"
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="evt-allday" className="cursor-pointer">
                Dia inteiro
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evt-location">
                <MapPin className="inline h-3 w-3 mr-1" />
                Local (opcional)
              </Label>
              <Input
                id="evt-location"
                placeholder="Ex: Sala de reuniões"
                value={form.location ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evt-desc">Descrição (opcional)</Label>
              <Input
                id="evt-desc"
                placeholder="Detalhes do evento…"
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {selectedEvent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              )}

              <Button onClick={handleSave} disabled={saving}>
                <Plus className="h-4 w-4 mr-1" />
                {selectedEvent ? "Salvar" : "Criar evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">
          Carregando eventos…
        </p>
      )}
    </div>
  );
}
