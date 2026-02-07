"use client";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@repo/ui/src/components/codeblock";
import { useTranslation } from "react-i18next";
import React from "react";
import { MemoizedReactMarkdown } from "../app/markdown";

export const FormattedMessage = ({
  message,
  username,
}: {
  message: any;
  username?: string;
}) => {
  const { t } = useTranslation();

  const formatBaseText = (message: any) => {
    return message?.text?.startsWith("Not enough crystals.")
      ? `${message?.text} [${t("Crystal Top-up")}](/crystals)`
      : message?.text;
  };

  const formatTranslationText = (message: any) => {
    return message?.translation
      ? `${message?.translation} *[${message?.text.trim()}]*`
      : "";
  };

  const replaceUsername = (text: string, username?: string) => {
    return text?.replaceAll("{{user}}", username ?? "").replace(/#+$/, "");
  };

  const baseText = formatBaseText(message);
  const translationText = formatTranslationText(message);
  const textContent = translationText || baseText;
  const formattedText = replaceUsername(textContent, username);

  return (
    <div
      className={`mb-1 flex flex-col gap-1 ${
        message?.characterId ? "items-start" : "items-end"
      }`}
    >
      <div
        className={`w-fit whitespace-pre-wrap rounded-xl ${
          message?.characterId
            ? "bg-gradient-to-b from-background to-muted shadow-lg"
            : "dark bg-gradient-to-t from-blue-400 to-blue-500 shadow-lg"
        } px-3 py-2 md:max-w-[36rem] lg:max-w-[48rem]`}
      >
        <MemoizedReactMarkdown
          className="prose break-words text-base text-foreground dark:prose-invert prose-p:m-0 prose-p:leading-relaxed prose-em:select-text prose-em:pr-0.5 prose-em:text-foreground/50 prose-pre:p-0"
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ children, href, target, rel }) => (
              <a href={href} rel={rel} target={target} className="underline">
                {children}
              </a>
            ),
            // Disable list rendering — model output should look like plain text, not formatted lists
            ol: ({ children }) => <>{children}</>,
            ul: ({ children }) => <>{children}</>,
            li: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
            code: ({ node, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              return (
                <CodeBlock
                  key={Math.random()}
                  language={(match && match[1]) || ""}
                  value={String(children).replace(/\n$/, "")}
                  {...props}
                />
              );
            },
          }}
        >
          {formattedText}
        </MemoizedReactMarkdown>
      </div>
    </div>
  );
};
