import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ControllerRenderProps, Control, Controller } from "react-hook-form";

type DateTimePickerFieldProps = {
  control: Control<any>;
  name: string;
  minDate?: Date;
  error?: any;
};

export default function DateTimePickerField({
  control,
  name,
  minDate = new Date(),
  error,
}: DateTimePickerFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value as Date | undefined;

        const handleDateSelect = (date: Date | undefined) => {
          if (!date) return;
          const newDate = new Date(date);
          if (value) {
            newDate.setHours(value.getHours(), value.getMinutes());
          } else {
            newDate.setHours(0, 0);
          }
          field.onChange(newDate);
        };

        const handleTimeChange = (part: "hours" | "minutes", val: string) => {
          if (!value) return;
          const newDate = new Date(value);
          if (part === "hours") newDate.setHours(Number(val));
          if (part === "minutes") newDate.setMinutes(Number(val));
          field.onChange(newDate);
        };

        return (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !value && "text-muted-foreground",
                    error && "border-red-600 focus-visible:ring-red-600",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value
                    ? format(value, "dd/MM/yyyy HH:mm")
                    : "Pick date & time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => date < minDate}
                    className="rounded-md border"
                  />
                  <div className="border-l p-3 flex flex-col gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Hour</Label>
                      <Select
                        value={
                          value
                            ? String(value.getHours()).padStart(2, "0")
                            : "00"
                        }
                        onValueChange={(v) => handleTimeChange("hours", v)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem
                              key={i}
                              value={String(i).padStart(2, "0")}
                            >
                              {String(i).padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Minute</Label>
                      <Select
                        value={
                          value
                            ? String(value.getMinutes()).padStart(2, "0")
                            : "00"
                        }
                        onValueChange={(v) => handleTimeChange("minutes", v)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(
                            (m) => (
                              <SelectItem
                                key={m}
                                value={String(m).padStart(2, "0")}
                              >
                                {String(m).padStart(2, "0")}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-red-600 text-sm mt-1">{error.message}</p>
            )}
          </>
        );
      }}
    />
  );
}
