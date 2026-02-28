"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/src/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/components/select";
import { useTranslation } from "react-i18next";
import { DEFAULT_MODEL, modelData } from "../../convex/constants";

const selectableModels = modelData.filter((m) =>
  [
    "NousResearch/Hermes-3-Llama-3.1-70B",
    "Sao10K/L3.3-70B-Euryale-v2.3",
    "Gryphe/MythoMax-L2-13b",
  ].includes(m.value),
);

export const ModelSelect = ({
  form,
  model,
  isNSFW,
}: {
  form: any;
  model: string;
  isNSFW?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="model"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("AI Model")}</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={DEFAULT_MODEL}
            value={field.value || DEFAULT_MODEL}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select an AI model for character." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {selectableModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {t("The AI model powering your character.")}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
