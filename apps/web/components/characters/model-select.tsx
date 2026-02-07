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
import { DEFAULT_MODEL } from "../../convex/constants";

// Single default model for all characters
const defaultModelOption = {
  value: DEFAULT_MODEL,
  description: "Dolphin Mistral 24B (Venice Edition)",
};

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

  // Always force the model to the default
  if (form.getValues("model") !== DEFAULT_MODEL) {
    form.setValue("model", DEFAULT_MODEL);
  }

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
            value={DEFAULT_MODEL}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select an AI model for character." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={defaultModelOption.value}>
                {defaultModelOption.description}
              </SelectItem>
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
